use actix_cors::Cors;
use actix_files::NamedFile;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Responder, Result};
use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use std::sync::Mutex;
use webbrowser;

const PAGE_SIZE: i64 = 20;

#[derive(Serialize)]
struct Novel {
    tid: i64,
    title: String,
    content: String,
}

#[derive(Serialize)]
struct PagedResult<T> {
    total: i64,
    page: i64,
    page_size: i64,
    records: Vec<T>,
}

struct AppState {
    conn: Mutex<Connection>,
}

// GET /api/search?target=title&keyword=xxx yyy&page=1
async fn search(
    data: web::Data<AppState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let target = query.get("target").map(|v| v.as_str()).unwrap_or("title");
    let keyword = query.get("keyword").cloned().unwrap_or_default();
    let page: i64 = query.get("page").and_then(|v| v.parse().ok()).unwrap_or(1);

    // 分词
    let keywords: Vec<String> = keyword
        .split_whitespace()
        .map(|s| format!("%{}%", s))
        .collect();

    let conn = data.conn.lock().unwrap();

    // 构建 WHERE 语句
    let column_expr = match target {
        "title" => "title",
        "content" => "content",
        "both" => "title || content",
        _ => "title",
    };

    let mut where_clauses = Vec::new();
    for _ in &keywords {
        where_clauses.push(format!("{} LIKE ?", column_expr));
    }

    let where_sql = if where_clauses.is_empty() {
        "1=1".to_string()
    } else {
        where_clauses.join(" AND ")
    };

    // 查询总数
    let count_sql = format!("SELECT COUNT(*) FROM novels WHERE {}", where_sql);
    let mut stmt = conn.prepare(&count_sql).unwrap();
    let total: i64 = stmt
        .query_row(rusqlite::params_from_iter(keywords.iter()), |row| {
            row.get(0)
        })
        .unwrap();

    // 分页 offset
    let offset = (page - 1) * PAGE_SIZE;

    // 查询记录
    let sql = format!(
        "SELECT tid, title, SUBSTR(content, 1, 500) FROM novels WHERE {} LIMIT ? OFFSET ?",
        where_sql
    );
    let mut stmt = conn.prepare(&sql).unwrap();

    let mut params_vec: Vec<&dyn rusqlite::ToSql> =
        keywords.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    params_vec.push(&PAGE_SIZE);
    params_vec.push(&offset);

    let params = rusqlite::params_from_iter(params_vec.into_iter());

    let records = match stmt.query_map(params, |row| {
        Ok(Novel {
            tid: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
        })
    }) {
        Ok(mapped) => match mapped.collect::<Result<Vec<_>, _>>() {
            Ok(vec) => vec,
            Err(_) => return HttpResponse::InternalServerError().body("collect failed"),
        },
        Err(_) => return HttpResponse::InternalServerError().body("query failed"),
    };

    HttpResponse::Ok().json(PagedResult {
        total,
        page,
        page_size: PAGE_SIZE,
        records,
    })
}

// GET /api/novel/{tid}
async fn get_novel(data: web::Data<AppState>, path: web::Path<i64>) -> impl Responder {
    let tid = path.into_inner();
    let conn = data.conn.lock().unwrap();

    let mut stmt = conn
        .prepare("SELECT tid, title, content FROM novels WHERE tid = ?")
        .unwrap();

    let result = stmt
        .query_row(params![tid], |row| {
            Ok(Novel {
                tid: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
            })
        })
        .optional()
        .unwrap();

    match result {
        Some(n) => HttpResponse::Ok().json(n),
        None => HttpResponse::NotFound().body("Not found"),
    }
}

async fn spa_index(_req: HttpRequest) -> Result<NamedFile> {
    Ok(NamedFile::open("./web/index.html")?)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let art = r#"
⠄⠄⢰⣿⠿⠄⡀⠄⠄⠄⠘⣷⡀⠄⠢⣄⠄⠄⠄⠄⠄⠄⠄⣠⠖⠁⠄⠄⠄
⠄⣤⢸⣿⣿⣆⠣⠄⠄⠄⠄⠸⣿⣦⡀⠙⢶⣦⣄⡀⠄⡠⠞⠁⢀⡴⠄⠄⠄
⢰⣿⣎⣿⣿⣿⣦⣀⠄⠄⠄⠄⠹⣿⣿⣦⢄⡙⠻⠿⠷⠶⠤⢐⣋⣀⠄⠄⠄
⢸⣿⠛⠛⠻⠿⢿⣿⣧⢤⣤⣄⣠⡘⣿⣿⣿⡟⠿⠛⠂⠈⠉⠛⢿⣿⠄⠄⠄
⠄⡇⢰⣿⣇⡀⠄⠄⣝⣿⣿⣿⣿⣿⣿⣿⣿⣶⣿⡄⠄⠈⠄⣷⢠⡆⠄⠄⠄
⢹⣿⣼⣿⣯⢁⣤⣄⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⣴⠶⣲⣵⠟⠄⠄⠄⠄
⠄⢿⣿⣿⣿⣷⣮⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣾⣟⣡⡴⠄⠄⠄⠄
⠄⠰⣭⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁⡀⠄⠄⠄
⠄⠄⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣭⣶⡞⠄⠄⠄⠄
⠄⠄⠐⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠄⠄⠄⠄⠄
⠄⠄⠄⠈⠻⣿⣿⣿⣿⣿⣿⣯⣿⣯⣿⣾⣿⣿⣿⣿⣿⡿⠋⠄⠄⠄⠄⠄⠄ 
"#;

    println!("{}", art);

    let server_url = "http://127.0.0.1:50721";
    let url_clone = server_url.to_string();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        if let Err(e) = webbrowser::open(&url_clone) {
            eprintln!("Failed to open browser: {}", e);
        }
    });

    let conn = Connection::open("./novels.db").expect("Open DB failed.");

    let state = web::Data::new(AppState {
        conn: Mutex::new(conn),
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(state.clone())
            .route("/api/search", web::get().to(search))
            .route("/api/novel/{tid}", web::get().to(get_novel))
            .service(actix_files::Files::new("/", "./web").index_file("index.html"))
            .default_service(actix_web::web::get().to(spa_index))
    })
    .bind(("0.0.0.0", 50721))?
    .run()
    .await
}

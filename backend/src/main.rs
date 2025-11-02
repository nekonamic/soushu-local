use actix_cors::Cors;
use actix_files::NamedFile;
use actix_web::{App, HttpRequest, HttpResponse, HttpServer, Responder, Result, web};
use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use std::sync::Mutex;
use tantivy::{TantivyDocument};
use tantivy::{schema::Value};
use tantivy_jieba::JiebaTokenizer;
use webbrowser;
use actix_web::middleware::Compress;

const PAGE_SIZE: i64 = 20;

#[derive(Serialize)]
struct Novel {
    tid: i64,
    title: String,
    content: String,
}

#[derive(Serialize)]
struct Record {
    tid: i64,
    title: String,
    snippet: String,
}

#[derive(Serialize)]
struct PagedResult {
    total: i64,
    page: i64,
    page_size: i64,
    records: Vec<Record>,
}

struct AppState {
    conn: Mutex<Connection>,
    index: tantivy::Index,
    reader: tantivy::IndexReader,
    title_field: tantivy::schema::Field,
    content_field: tantivy::schema::Field,
    tid_field: tantivy::schema::Field,
}

// GET /api/search?target=title&keyword=xxx yyy&page=1
async fn search(
    data: web::Data<AppState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let target = query.get("target").cloned().unwrap_or_default();
    let keyword = query.get("keyword").cloned().unwrap_or_default();
    let page: usize = query.get("page").and_then(|v| v.parse().ok()).unwrap_or(1);

    let searcher = data.reader.searcher();
    let fields = match target.as_str() {
        "title" => vec![data.title_field],
        "content" => vec![data.content_field],
        "both" => vec![data.title_field, data.content_field],
        _ => return HttpResponse::BadRequest().body("invalid query"),
    };
    let query_parser = tantivy::query::QueryParser::for_index(&data.index, fields);

    let query_obj = match query_parser.parse_query(&keyword) {
        Ok(q) => q,
        Err(_) => return HttpResponse::BadRequest().body("invalid query"),
    };

    let top_docs = match searcher.search(
        &query_obj,
        &tantivy::collector::TopDocs::with_limit(PAGE_SIZE as usize)
            .and_offset((page - 1) * PAGE_SIZE as usize),
    ) {
        Ok(r) => r,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    let conn = data.conn.lock().unwrap();
    let mut records = Vec::new();

    for (_score, addr) in top_docs {
        if let Ok(doc) = searcher.doc::<TantivyDocument>(addr) {
            let tid_val = doc.get_first(data.tid_field).unwrap().as_u64().unwrap() as i64;
            let title_val = doc.get_first(data.title_field).unwrap().as_str().unwrap().to_string();

            let mut stmt = conn
                .prepare("SELECT substr(content, 1, 100) FROM novels WHERE tid=?1")
                .unwrap();

            if let Ok(snippet) = stmt.query_row([tid_val], |row| row.get::<usize, String>(0)) {
                records.push(Record {
                    tid: tid_val,
                    title: title_val,
                    snippet,
                });
            }
        }
    }

    let total = match searcher.search(&query_obj, &tantivy::collector::Count) {
        Ok(c) => c as i64,
        _ => 0,
    };

    HttpResponse::Ok().json(PagedResult {
        total,
        page: page as i64,
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

Server Start
"#;

    println!("{}", art);

    let jieba_tokenizer = JiebaTokenizer {};

    let index = tantivy::Index::open_in_dir("./index").expect("idx open fail");
    index.tokenizers().register("jieba", jieba_tokenizer);
    let schema = index.schema();
    let reader = index.reader().unwrap();

    let title_field = schema.get_field("title").unwrap();
    let content_field = schema.get_field("content").unwrap();
    let tid_field = schema.get_field("tid").unwrap();

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
        index,
        reader,
        title_field,
        content_field,
        tid_field,
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Compress::default())
            .wrap(actix_web::middleware::NormalizePath::trim())
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

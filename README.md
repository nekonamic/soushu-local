# 搜书吧本地全文搜索服务器

前端使用 `Vue3` + `Tailwind` + `PrimeVue`

后端使用 `Rust` + `Axtic` + `Rusqlite` + `Tantivy`

## 在线预览DEMO

https://soushu.inf.li/

## 前端开发

```shell
pnpm i
pnpm dev
```

## 前端构建

```shell
pnpm build
```

## 后端编译

```shell
cargo build --release
```

## 运行时文件结构

将前端构建后的文件放置于`./web/`文件夹中

将后端编译后的二进制文件放置于`./start.exe`

将小说数据库放置于`./novels.db`

将分词数据放置于`./index/`

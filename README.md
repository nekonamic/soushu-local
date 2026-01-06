# 搜书吧本地全文搜索服务器

前端使用 `Vue3` + `Tailwind` + `PrimeVue`

后端使用 `Rust` + `Axtic` + `Rusqlite` + `Tantivy`

## 在线预览DEMO

https://soushu.inf.li/

网站可能偶尔无法正常使用，我会尽快修复的，如需高可用建议自托管

## 数据下载

**警告**

> piracy is meant to be free. Those who sell pirated contents are all losers and if you are paying for pirated contents then you are the biggest loser.

“盗版本来就是免费的。那些出售盗版内容的人都是失败者，而如果你为盗版内容付费，那么你就是最大的失败者。

---

- 数据库与分词数据

https://pan.baidu.com/s/1F4ON4mspyJOAPXD1Kgkmkg?pwd=x6y8 提取码: x6y8 

**注意**

这是未去重未清洗的原始数据，里面包含大量重复的、极少量乱码的小说（乱码并非编码问题，原本就是乱码的），但同样也是最全的数据

---

- 爬虫源代码

https://github.com/nekonamic/soushu-go

## Docker 部署

将下载好的小说数据库`novels.db`与分词数据`index/`至于相同的目录下，挂载在镜像的`/app/data`

```shell
git clone https://github.com/nekonamic/soushu-local.git
cd soushu-local
docker build -t soushu-docker ./
docker run -d -p 50721:50721 -v /path/to/your/data/folder:/app/data soushu-docker
```

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

将小说数据库放置于`./data/novels.db`

将分词数据放置于`./data/index/`

```
.
├── start.exe
├── data
│   ├── index
│   │   └── ...
│   └── novels.db
└── web
    └── ...
```

## 不想/不会编译

Windows用户可以在release中找到预编译文件

### 后记

第一次发布个人项目没想到愿意使用的人这么多，感觉很开心，有任何问题建议或需求都可以发issue或PM我

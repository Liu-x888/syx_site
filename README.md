# 芽芽轩的小世界 🌊💙

宋亚轩个人介绍网站（粉丝自制 · 非官方），青色 #E1F5FA + 蓝色 #63C5DE 主题，包含四个页面：

| 页面 | 文件 | 说明 |
| --- | --- | --- |
| 首页（个人简介） | index.html | Hero、个人档案、多面魅力、数据条 |
| 照片墙 | photos.html | 瀑布流照片墙 + 点击放大 |
| 作品集 | works.html | 音乐 / 综艺 / 话剧 / 组合歌曲，可筛选 |
| 互动留言板 | comments.html | 匿名留言 + 点赞 + 最新/最热排序（当前演示模式） |

## 一、替换真实照片 📸

1. 把照片放进 `photos/` 文件夹（建议用 jpg/png，文件名如 `photo-01.jpg`）。
2. 打开 `js/gallery-data.js`，把每条数据里的 `src` 改成你的文件名，并更新 `cap` 描述。
3. 建议保持横版、竖版、方形混合，瀑布流更好看。删除不用的占位 svg 文件即可。

## 二、修改内容 ✏️

- **个人档案 / 能力 / 简介文字 / 数据条**：都在 `js/data.js` 里改。
- **作品列表**：也在 `js/data.js` 里改（每个分类一个数组）。
- **导航 / 页面结构 / 文案**：直接改对应的 html 文件。
- **颜色主题**：在 `css/style.css` 顶部的 `:root` 里改。

## 三、在本地预览 👀

直接用浏览器双击打开 `index.html` 即可，或（推荐）在项目目录运行：
`python -m http.server 8000`，然后浏览器访问 http://localhost:8000

## 四、发布上线（免费公开网址）🔗

### 方式 A：GitHub Pages（推荐，免费、稳定）

1. 注册/登录 [GitHub](https://github.com)，新建一个仓库（Public）。
2. 把本文件夹里所有文件上传到仓库（网页端 "Add file → Upload files" 拖拽即可）。
3. 进入仓库 **Settings → Pages**，Source 选 `main` 分支，根目录 `/`，点 Save。
4. 等 1~2 分钟，就会得到一个网址：`https://你的用户名.github.io/仓库名/`
   - 把网址发给朋友，点击即可访问，无需登录。

### 方式 B：Netlify Drop（不用账号也能快速试）

1. 打开 [Netlify Drop](https://app.netlify.com/drop)，把整个文件夹拖进去。
2. 几秒后生成一个 `https://xxx.netlify.app` 的临时网址，可直接分享。

> 注意：用 Netlify Drop 免费版临时网址可能过期，长期使用建议用 GitHub Pages 或注册 Netlify 账号部署。

## 五、留言板接入云端（待你确认后执行）💬

当前留言板是演示模式（数据存在访客本机浏览器）。要变成"所有人留言互通"：

1. 注册 [Supabase](https://supabase.com)（邮箱即可），新建一个项目。
2. 把项目里的 `URL` 和 `anon key` 填入 `js/comments.js` 顶部。
3. 在 Supabase SQL 编辑器运行下面这句，创建留言表：
   ```sql
   create table comments (
     id uuid primary key default gen_random_uuid(),
     text text not null,
     likes int not null default 0,
     created_at timestamptz not null default now()
   );
   alter table comments enable row level security;
   create policy "匿名可留言" on comments for insert with check (true);
   create policy "匿名可阅读" on comments for select using (true);
   create policy "匿名可点赞" on comments for update using (true);
   ```
4. 我在 `js/comments.js` 里把存储适配器换成云端请求即可。

## 六、小提示

- 留言板自带 30 秒防刷和敏感词过滤，可在 `js/comments.js` 里调整。
- 网站所有页面均为静态文件，发布后无需服务器。

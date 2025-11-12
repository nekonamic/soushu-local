import { initializeNovels, getAllNovels, getNovelById, loadNovelContent, searchNovels as searchNovelsLocal, type NovelInfo } from '@/data/novels'
import { loadFileChunk, type LoadChunkResult } from '@/utils/fileLoader'

// API模式配置
let apiBase = import.meta.env.VITE_API_BASE ||
  `${window.location.protocol}//${window.location.host}`;

// 模式管理
type AppMode = 'frontend' | 'api';

// 设置API Base
export function setApiBase(base: string) {
  apiBase = base;
}

// 获取API Base
export function getApiBase(): string {
  return apiBase;
}

// API模式的搜索实现
export async function searchNovelsApi(
  target: "title" | "content" | "both",
  keyword: string,
  page: number = 1,
): Promise<{
  total: number;
  page: number;
  page_size: number;
  records: Array<{
    tid: number;
    title: string;
    count: number;
  }>;
}> {
  const params = new URLSearchParams({
    target,
    keyword,
    page: page.toString(),
  });

  const response = await fetch(`${apiBase}/api/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("请求失败");
  }
  return response.json();
}

// API模式的小说内容获取
export async function getNovelApi(tid: number): Promise<{
  tid: number;
  title: string;
  content: string;
}> {
  const response = await fetch(`${apiBase}/api/novel/${tid}`);
  if (!response.ok) {
    throw new Error("请求失败");
  }
  return response.json();
}

export interface Novel {
	tid: number;
	title: string;
	content: string;
}

export interface PagedResult<T> {
	total: number;
	page: number;
	page_size: number;
	records: T[];
}

export interface Record {
	tid: number;
	title: string;
	count: number;
	author?: string;
	pathParts?: string[];
}

// 初始化小说管理器
let isInitialized = false;
async function ensureInitialized() {
	if (!isInitialized) {
		await initializeNovels();
		isInitialized = true;
	}
}

export async function searchNovels(
	target: "title" | "content" | "author" | "both",
	keyword: string,
	page: number = 1,
): Promise<PagedResult<Record>> {
	await ensureInitialized();

	const pageSize = 20;
	const startIndex = (page - 1) * pageSize;

	try {
		let results: Record[] = [];

		if (keyword.trim()) {
			// 如果搜索关键词不为空，进行搜索
			// 过滤掉 'content' 类型，因为前端模式不支持内容搜索
			const localTarget = target === 'content' ? 'title' : target;
			const searchResults = await searchNovelsLocal(keyword, localTarget as 'title' | 'author' | 'both');
			results = searchResults.map(result => {
				const novel = getNovelById(result.id);
				return {
					tid: result.id,
					title: result.title,
					count: result.count,
					author: novel?.author,
					pathParts: novel?.pathParts
				};
			});
		} else {
			// 如果搜索关键词为空，返回所有小说列表
			const allNovels = getAllNovels();
			results = allNovels.map(novel => ({
				tid: novel.id,
				title: novel.title,
				count: novel.wordCount,
				author: novel.author,
				pathParts: novel.pathParts
			}));
		}

		// 计算分页
		const total = results.length;
		const paginatedResults = results.slice(startIndex, startIndex + pageSize);

		return {
			total,
			page,
			page_size: pageSize,
			records: paginatedResults
		};
	} catch (error) {
		console.error('搜索小说失败:', error);
		throw new Error("搜索失败");
	}
}


// 格式化字数显示
export function formatWordCount(count: number): string {
	if (count === 0) return '未知';

	// 始终显示具体数字，使用千位分隔符
	return count.toLocaleString() + '字';
}

export async function getNovel(tid: number): Promise<Novel> {
	await ensureInitialized();

	try {
		const novelInfo = getNovelById(tid);
		if (!novelInfo) {
			throw new Error(`未找到ID为 ${tid} 的小说`);
		}

		// 加载小说内容
		const content = await loadNovelContent(tid);

		return {
			tid: novelInfo.id,
			title: novelInfo.title,
			content
		};
	} catch (error) {
		console.error('获取小说失败:', error);
		throw new Error("获取小说失败");
	}
}

// 新增：分块加载小说内容的API
export async function getNovelChunk(tid: number, chunkSize: number = 50000): Promise<LoadChunkResult> {
	await ensureInitialized();

	try {
		const novelInfo = getNovelById(tid);
		if (!novelInfo) {
			throw new Error(`未找到ID为 ${tid} 的小说`);
		}

		return await loadFileChunk(novelInfo.filePath, { chunkSize });
	} catch (error) {
		console.error('获取小说片段失败:', error);
		throw new Error("获取小说失败");
	}
}

// 新增：获取小说元数据（不加载内容）
export async function getNovelMeta(tid: number): Promise<{ tid: number; title: string; author: string; fileSize: string; pathParts: string[] }> {
	await ensureInitialized();

	const novelInfo = getNovelById(tid);
	if (!novelInfo) {
		throw new Error(`未找到ID为 ${tid} 的小说`);
	}

	return {
		tid: novelInfo.id,
		title: novelInfo.title,
		author: novelInfo.author,
		fileSize: novelInfo.fileSize,
		pathParts: novelInfo.pathParts
	};
}

// 新增：获取所有小说列表（用于首页展示）
export async function getAllNovelList(): Promise<Record[]> {
	await ensureInitialized();

	const allNovels = getAllNovels();
	return allNovels.map(novel => ({
		tid: novel.id,
		title: novel.title,
		count: novel.wordCount
	}));
}

// 随机推荐小说（API模式）
export async function getRandomRecommendations(): Promise<PagedResult<Record>> {
	// 随机生成页码 1-6993
	const randomPage = Math.floor(Math.random() * 6993) + 1;

	// 使用中文句号作为关键词进行正文搜索
	const response = await searchNovelsApi('content', '。', randomPage);

	// 转换API响应为Record格式
	const records: Record[] = response.records.map(item => ({
		tid: item.tid,
		title: item.title,
		count: item.count, // 使用API返回的字数信息
		author: undefined,
		pathParts: undefined
	}));

	return {
		total: response.total,
		page: response.page,
		page_size: response.page_size,
		records
	};
}

// 重新导出小说数据管理函数
export { initializeNovels } from '@/data/novels';

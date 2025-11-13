const apiBase =
	import.meta.env.VITE_API_BASE ||
	`${window.location.protocol}//${window.location.host}`;

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
}

export async function searchNovels(
	target: "title" | "content" | "both",
	keyword: string,
	page: number = 1,
): Promise<PagedResult<Record>> {
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

export async function randomNovels(): Promise<PagedResult<Record>> {
	const response = await fetch(`${apiBase}/api/random`);
	if (!response.ok) {
		throw new Error("请求失败");
	}
	return response.json();
}

export async function getNovel(tid: number): Promise<Novel> {
	const response = await fetch(`${apiBase}/api/novel/${tid}`);
	if (!response.ok) {
		throw new Error("请求失败");
	}
	return response.json();
}

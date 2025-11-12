export interface Progress {
	tid: number | string;
	progress: number;
	title?: string;   // 小说标题，用于显示
	selectedRuleId?: number | string;
}

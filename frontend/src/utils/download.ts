import { getNovel } from "@/api/main";

export async function downloadNovel(tid: number) {
    const novel = await getNovel(tid);

    const blob = new Blob([novel.content], { type: "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${novel.title}.txt`;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
export { getNovel };

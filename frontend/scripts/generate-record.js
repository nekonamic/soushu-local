import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 生成 record.json 文件，包含小说字数信息
 */
async function generateRecordJson() {
  const novelsDir = path.join(__dirname, '../public/novels');
  const recordFile = path.join(novelsDir, 'record.json');

  try {
    // 检查目录是否存在
    if (!fs.existsSync(novelsDir)) {
      console.error('小说目录不存在:', novelsDir);
      return;
    }

    const records = [];

    console.log('开始扫描小说文件...');
    console.log('📁 扫描目录:', novelsDir);
    console.log('🔍 支持任意层级目录结构');
    console.log('📝 新格式: ["路径", "大小", "字数"]');
    console.log('');

    // 递归扫描目录
    await scanDirectory(novelsDir, '', records);

    // 按路径排序
    records.sort((a, b) => {
      return a[0].localeCompare(b[0], 'zh-CN');
    });

    // 写入 record.json
    fs.writeFileSync(recordFile, JSON.stringify(records, null, 2), 'utf8');

    console.log(`✅ 生成完成！`);
    console.log(`📚 共处理 ${records.length} 本小说`);
    console.log(`📁 输出文件: ${recordFile}`);
    console.log('');
    console.log('📊 统计信息:');

    let totalChars = 0;
    let knownCharCount = 0;
    let unknownCharCount = 0;
    const pathStats = new Map(); // 统计路径结构

    records.forEach(([filePath, size, wordCountStr]) => {
      // 统计字数
      if (wordCountStr && wordCountStr.includes('字')) {
        const charNum = parseInt(wordCountStr.replace('字', ''));
        if (!isNaN(charNum)) {
          totalChars += charNum;
          knownCharCount++;
        } else {
          unknownCharCount++;
        }
      }

      // 统计路径结构
      const pathParts = filePath.split('/');
      if (pathParts.length >= 2) {
        const structure = pathParts.length === 2 ? '作者/小说' : `${pathParts[0]}/...`;
        pathStats.set(structure, (pathStats.get(structure) || 0) + 1);
      }
    });

    console.log(`  • 总字数: ${totalChars.toLocaleString()}字`);
    console.log(`  • 已知字数: ${knownCharCount}本`);
    console.log(`  • 未知字数: ${unknownCharCount}本`);
    console.log('');
    console.log('📂 目录结构统计:');
    pathStats.forEach((count, structure) => {
      console.log(`  • ${structure}: ${count}本`);
    });

  } catch (error) {
    console.error('生成 record.json 失败:', error);
  }
}

/**
 * 递归扫描目录
 */
async function scanDirectory(currentDir, relativePath, records) {
  const items = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(currentDir, item.name);
    const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;

    if (item.isDirectory()) {
      // 递归扫描子目录
      await scanDirectory(itemPath, itemRelativePath, records);
    } else if (item.name.endsWith('.txt')) {
      // 排除 robots.txt 文件
      if (item.name.toLowerCase() === 'robots.txt') {
        continue;
      }

      // 处理txt文件
      try {
        // 获取文件信息
        const stats = fs.statSync(itemPath);
        const fileSize = stats.size;

        // 读取文件内容计算字数
        console.log(`正在处理: ${itemRelativePath}`);
        const content = fs.readFileSync(itemPath, 'utf8');
        const charCount = content.length;

        // 格式化文件大小
        const formattedSize = formatFileSize(fileSize);

        // 新格式: ["路径", "大小", "字数"]
        records.push([
          itemRelativePath.replace(/\\/g, '/'),
          formattedSize,
          `${charCount}字`
        ]);

        console.log(`  ✓ 路径: ${itemRelativePath}`);
        console.log(`  ✓ 文件大小: ${formattedSize}`);
        console.log(`  ✓ 字数: ${charCount.toLocaleString()}字`);
        console.log('');

      } catch (error) {
        console.error(`处理文件失败 ${itemRelativePath}:`, error.message);

        // 如果读取失败，只记录基本信息
        const stats = fs.statSync(itemPath);
        records.push([
          itemRelativePath.replace(/\\/g, '/'),
          formatFileSize(stats.size),
          '未知字数'
        ]);
      }
    }
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}

// 运行脚本
generateRecordJson();

export { generateRecordJson };
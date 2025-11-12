#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 构建时更新版本号脚本
 * 自动生成基于时间戳和内容的hash值，更新到环境变量文件
 */

// 获取环境信息
const getEnvironmentInfo = () => {
  const now = new Date();
  const env = process.env.NODE_ENV || 'development';

  return {
    env,
    timestamp: now.getTime(),
    date: now.toISOString().split('T')[0], // YYYY-MM-DD
    time: now.toTimeString().split(' ')[0].replace(/:/g, ''), // HHMMSS
    year: now.getFullYear(),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0')
  };
};

// 生成内容hash
const generateContentHash = () => {
  try {
    // 读取package.json作为内容基础
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8');

    // 读取src目录下的主要文件
    const srcDir = path.join(process.cwd(), 'src');
    let contentHash = packageJson;

    if (fs.existsSync(srcDir)) {
      const mainFiles = [
        'main.ts',
        'App.vue',
        'router/index.ts',
        'store/app.ts'
      ];

      mainFiles.forEach(file => {
        const filePath = path.join(srcDir, file);
        if (fs.existsSync(filePath)) {
          contentHash += fs.readFileSync(filePath, 'utf8');
        }
      });
    }

    // 生成SHA256 hash并取前8位
    return crypto.createHash('sha256').update(contentHash).digest('hex').substring(0, 8);
  } catch (error) {
    console.warn('生成内容hash失败:', error.message);
    return Date.now().toString(36); // 降级方案：使用时间戳
  }
};

// 生成版本号
const generateVersionHash = (env, info) => {
  const contentHash = generateContentHash();

  // 统一使用hash值作为版本号
  return contentHash;
};

// 更新环境变量文件
const updateEnvFile = (envType, projectHash) => {
  const envFile = path.join(process.cwd(), `.env.${envType}`);
  const exampleFile = path.join(process.cwd(), '.env.example');

  // 如果环境文件不存在，尝试从example文件复制
  if (!fs.existsSync(envFile) && fs.existsSync(exampleFile)) {
    fs.copyFileSync(exampleFile, envFile);
    console.log(`✅ 已从 .env.example 创建 .env.${envType}`);
  }

  if (!fs.existsSync(envFile)) {
    console.log(`⚠️  .env.${envType} 文件不存在，跳过更新`);
    return false;
  }

  try {
    let content = fs.readFileSync(envFile, 'utf8');

    // 更新或添加 VITE_PROJECT_HASH
    const hashRegex = /^VITE_PROJECT_HASH=.*$/m;
    if (hashRegex.test(content)) {
      content = content.replace(hashRegex, `VITE_PROJECT_HASH=${projectHash}`);
    } else {
      // 如果没有找到，在文件末尾添加
      content += `\n# 项目标识符（自动生成）\nVITE_PROJECT_HASH=${projectHash}\n`;
    }

    fs.writeFileSync(envFile, content);
    console.log(`✅ 已更新 .env.${envType} 中的 VITE_PROJECT_HASH: ${projectHash}`);
    return true;
  } catch (error) {
    console.error(`❌ 更新 .env.${envType} 失败:`, error.message);
    return false;
  }
};

// 主函数
const main = () => {
  console.log('🚀 开始更新版本号...');

  const envInfo = getEnvironmentInfo();
  const env = envInfo.env;

  console.log(`📋 环境信息: ${env}`);
  console.log(`📅 时间: ${envInfo.date} ${envInfo.time}`);

  // 生成版本号
  const projectHash = generateVersionHash(env, envInfo);
  console.log(`🔧 生成版本号: ${projectHash}`);

  // 确定要更新的环境文件
  const envFilesToUpdate = [];

  // 构建时总是更新所有环境文件
  envFilesToUpdate.push('development', 'production');

  // 更新环境文件
  let successCount = 0;
  envFilesToUpdate.forEach(envType => {
    // 为每个环境生成特定的版本号
    const envSpecificHash = generateVersionHash(envType, envInfo);
    if (updateEnvFile(envType, envSpecificHash)) {
      successCount++;
    }
  });

  if (successCount > 0) {
    console.log(`✨ 版本号更新完成！成功更新 ${successCount} 个文件`);

    // 将版本号写入临时文件，供其他构建步骤使用
    const versionFile = path.join(process.cwd(), '.version');
    fs.writeFileSync(versionFile, projectHash);
    console.log(`📝 版本号已保存到 .version 文件`);
  } else {
    console.error('❌ 版本号更新失败');
    process.exit(1);
  }
};

// 如果直接运行此脚本
if (process.argv[1] && process.argv[1].endsWith('update-version.js')) {
  main();
}

export {
  generateVersionHash,
  updateEnvFile,
  main
};
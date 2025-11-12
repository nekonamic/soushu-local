@echo off
setlocal enabledelayedexpansion

echo 🚀 开始更新版本号...

:: 获取当前日期和时间
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "Sec=%dt:~12,2%"

set "DATE=%YYYY%-%MM%-%DD%"
set "TIME=%HH%%Min%"

:: 获取环境类型
if "%NODE_ENV%"=="" (
    set "ENV=development"
) else (
    set "ENV=%NODE_ENV%"
)

echo 📋 环境信息: %ENV%
echo 📅 时间: %DATE% %TIME%

:: 生成随机hash（简单版本）
set "HASH=%RANDOM%%RANDOM%"
set "HASH=%HASH:~0,8%"

:: 根据环境生成版本号
if "%ENV%"=="production" (
    set "VERSION=prod-%DATE%-%HASH%"
) else if "%ENV%"=="development" (
    set "VERSION=dev-%DATE%-%HASH%"
) else (
    set "VERSION=%ENV%-%DATE%-%HASH%"
)

echo 🔧 生成版本号: %VERSION%

:: 更新环境文件
set "ENV_FILE=.env.%ENV%"
if not exist "%ENV_FILE%" (
    if exist ".env.example" (
        copy ".env.example" "%ENV_FILE%"
        echo ✅ 已从 .env.example 创建 %ENV_FILE%
    ) else (
        echo ⚠️  %ENV_FILE% 文件不存在，跳过更新
        goto :end
    )
)

:: 检查文件中是否已存在VITE_PROJECT_HASH
findstr /C:"VITE_PROJECT_HASH=" "%ENV_FILE%" >nul
if %errorlevel%==0 (
    :: 更新现有的版本号
    powershell -Command "(Get-Content '%ENV_FILE%') -replace '^VITE_PROJECT_HASH=.*', 'VITE_PROJECT_HASH=%VERSION%' | Set-Content '%ENV_FILE%'"
    echo ✅ 已更新 %ENV_FILE% 中的 VITE_PROJECT_HASH: %VERSION%
) else (
    :: 添加新的版本号
    echo # 项目标识符（自动生成）>> "%ENV_FILE%"
    echo VITE_PROJECT_HASH=%VERSION%>> "%ENV_FILE%"
    echo ✅ 已在 %ENV_FILE% 中添加 VITE_PROJECT_HASH: %VERSION%
)

:: 保存版本号到临时文件
echo %VERSION%> .version
echo 📝 版本号已保存到 .version 文件

:end
echo ✨ 版本号更新完成！
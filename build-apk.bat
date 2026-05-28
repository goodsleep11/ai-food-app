@echo off
chcp 65001 >nul
echo ========================================
echo    AI食物识别助手 - 本地打包
echo ========================================
echo.

:: 查找 Java（优先用 Android Studio 自带的 JDK）
set "JAVA_HOME="
if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    echo [OK] 使用 Android Studio 自带 JDK
) else if exist "C:\Program Files\Android\Android Studio\jre" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jre"
    echo [OK] 使用 Android Studio 自带 JRE
) else (
    echo [ERROR] 未找到 Android Studio，请先安装
    echo 下载地址: https://developer.android.com/studio
    pause
    exit /b 1
)

set "PATH=%JAVA_HOME%\bin;%PATH%"

:: 查找 Android SDK
set "ANDROID_HOME="
if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    echo [OK] Android SDK 已找到
) else if exist "C:\Android\Sdk" (
    set "ANDROID_HOME=C:\Android\Sdk"
    echo [OK] Android SDK 已找到
) else (
    echo [ERROR] 未找到 Android SDK，请先在 Android Studio 中安装
    echo 打开 Android Studio → More Actions → SDK Manager → 安装 Android 14.0 (API 34)
    pause
    exit /b 1
)

set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

echo.
echo 环境检查通过！
echo JAVA_HOME = %JAVA_HOME%
echo ANDROID_HOME = %ANDROID_HOME%
echo.

:: 检查 node_modules
if not exist "node_modules\" (
    echo [ERROR] node_modules 不存在，请先执行 npm install
    pause
    exit /b 1
)

:: 步骤1: 生成 Android 原生项目
echo [1/4] 生成 Android 原生项目...
call npx expo prebuild --platform android --clean
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] prebuild 失败
    pause
    exit /b 1
)

:: 步骤2: 修复 Gradle 版本兼容性
echo.
echo [2/4] 修复 Gradle 版本...
node scripts/fix-gradle.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle 修复失败
    pause
    exit /b 1
)

:: 步骤3: 编译 APK
echo.
echo [3/4] 编译 APK（首次需下载 Gradle，约 3-5 分钟）...
cd android
call gradlew.bat assembleDebug
cd ..
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 编译失败
    pause
    exit /b 1
)

:: 步骤4: 显示结果
echo.
echo [4/4] 打包完成！
echo.
echo ========================================
echo   APK 文件位置:
echo   %CD%\android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================
echo.
echo 把上面这个 .apk 文件发到手机安装即可！
echo 方法: USB 数据线复制、微信文件传输、QQ 面对面快传
echo.

:: 用资源管理器打开 APK 所在文件夹
explorer "%CD%\android\app\build\outputs\apk\debug\"

pause

// 修复 expo prebuild 生成的 Gradle 版本兼容性问题
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');

// 1. 修复 android/build.gradle — 锁定 AGP 版本
const buildGradlePath = path.join(androidDir, 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');
buildGradle = buildGradle.replace(
  /com\.android\.tools\.build:gradle:[^\n"']*/g,
  'com.android.tools.build:gradle:8.3.0'
);
fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
console.log('[OK] build.gradle — AGP 锁定为 8.3.0');

// 2. 修复 gradle-wrapper.properties — 锁定 Gradle 版本
const wrapperPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
let wrapper = fs.readFileSync(wrapperPath, 'utf-8');
wrapper = wrapper.replace(
  /distributionUrl=.*/,
  'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip'
);
fs.writeFileSync(wrapperPath, wrapper, 'utf-8');
console.log('[OK] gradle-wrapper.properties — Gradle 锁定为 8.7');

console.log('Gradle 版本修复完成');

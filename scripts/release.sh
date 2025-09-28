#!/bin/bash

# 发布脚本 - 自动化版本发布流程
# 使用方法: ./scripts/release.sh [patch|minor|major]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认版本类型
VERSION_TYPE=${1:-patch}

# 验证版本类型
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}错误: 版本类型必须是 patch, minor 或 major${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 开始发布流程...${NC}"

# 1. 检查工作区是否干净
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  检测到未提交的更改${NC}"
    echo "是否要提交这些更改？(y/n)"
    read -r answer
    if [[ "$answer" == "y" ]]; then
        git add .
        echo "请输入提交信息:"
        read -r commit_message
        git commit -m "$commit_message"
    else
        echo -e "${RED}请先处理未提交的更改${NC}"
        exit 1
    fi
fi

# 2. 拉取最新代码
echo -e "${GREEN}📥 拉取最新代码...${NC}"
git pull origin main

# 3. 安装依赖
echo -e "${GREEN}📦 安装依赖...${NC}"
npm ci

# 4. 构建项目
echo -e "${GREEN}🔨 构建项目...${NC}"
npm run build

# 5. 运行测试（如果有的话）
if npm run test --if-present; then
    echo -e "${GREEN}✅ 测试通过${NC}"
else
    echo -e "${YELLOW}⚠️  测试失败或没有测试${NC}"
fi

# 6. 更新版本号
echo -e "${GREEN}📝 更新版本号 (${VERSION_TYPE})...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# 获取新版本号
NEW_VERSION=$(node -p "require('./package.json').version")

# 7. 重新构建（使用新版本号）
echo -e "${GREEN}🔨 使用新版本号重新构建...${NC}"
npm run build

# 8. 提交版本更新
echo -e "${GREEN}📤 提交版本更新...${NC}"
git add .
git commit -m "chore: bump version to v${NEW_VERSION}"

# 9. 创建 tag
echo -e "${GREEN}🏷️  创建标签 v${NEW_VERSION}...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release version ${NEW_VERSION}"

# 10. 推送到远程
echo -e "${GREEN}🚀 推送到远程仓库...${NC}"
git push origin main
git push origin "v${NEW_VERSION}"

echo -e "${GREEN}✨ 发布完成！${NC}"
echo -e "${GREEN}版本 v${NEW_VERSION} 已经推送到 GitHub${NC}"
echo -e "${YELLOW}GitHub Actions 将自动发布到 npm${NC}"
echo ""
echo -e "查看发布状态:"
echo -e "  GitHub Actions: https://github.com/hangox/google-search/actions"
echo -e "  npm 包: https://www.npmjs.com/package/@hangox/google-search"
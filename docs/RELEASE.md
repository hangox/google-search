# 发布指南

## 自动发布（推荐）

项目已配置 GitHub Actions，当你创建并推送 tag 时会自动发布到 npm。

### 前置要求

1. **设置 NPM Token**
   - 登录 [npmjs.com](https://www.npmjs.com/)
   - 进入 Account Settings → Access Tokens
   - 点击 "Generate New Token"
   - 选择 "Automation" 类型（这种 token 不需要 2FA）
   - 复制生成的 token

2. **配置 GitHub Secret**
   - 进入 GitHub 仓库的 Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: 粘贴你的 npm token
   - 点击 "Add secret"

### 发布流程

使用提供的发布脚本：

```bash
# 发布补丁版本 (1.0.1 -> 1.0.2)
npm run release:patch

# 发布次版本 (1.0.2 -> 1.1.0)
npm run release:minor

# 发布主版本 (1.1.0 -> 2.0.0)
npm run release:major
```

脚本会自动：
1. 检查工作区状态
2. 拉取最新代码
3. 安装依赖
4. 构建项目
5. 更新版本号
6. 提交更改
7. 创建 tag
8. 推送到 GitHub
9. GitHub Actions 自动发布到 npm

## 手动发布

如果需要手动发布：

```bash
# 1. 更新版本号
npm version patch  # 或 minor/major

# 2. 构建项目
npm run build

# 3. 发布到 npm（需要 2FA）
npm publish --access public --otp=<你的2FA码>

# 4. 推送 tag 到 GitHub
git push origin main --tags
```

## 版本号规范

遵循语义化版本规范 (Semantic Versioning):

- **patch** (x.x.1): 修复 bug，向后兼容
- **minor** (x.1.x): 新增功能，向后兼容
- **major** (1.x.x): 重大变更，可能不兼容

## 发布前检查清单

- [ ] 所有测试通过
- [ ] 代码已提交并推送
- [ ] README 更新（如有需要）
- [ ] CHANGELOG 更新（如有需要）
- [ ] 版本号符合语义化规范

## 查看发布状态

- GitHub Actions: https://github.com/hangox/google-search/actions
- npm 包页面: https://www.npmjs.com/package/@hangox/google-search
- GitHub Releases: https://github.com/hangox/google-search/releases
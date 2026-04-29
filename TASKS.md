# CyclingComputer MVP Task Document

## Document Info

- Project: `CyclingComputer`
- Product: 微信小程序骑行码表 MVP
- Document Type: Execution Task List
- Primary Goal: 交付一个可运行的微信小程序 MVP，支持骑行记录、总结和历史查看
- Source References: `PRD.md`, `tech_spec.md`, `file_structure.md`

## Execution Rules

- 所有任务默认以 MVP 为边界，不扩展社交、地图轨迹、后台持续定位等非必要能力。
- 优先保证功能闭环：开始骑行 -> 骑行中 -> 暂停/继续 -> 结束 -> 总结 -> 保存 -> 历史查看。
- 所有数据以本地存储为准，不接入云端或第三方服务。
- 所有核心逻辑需与 `tech_spec.md` 保持一致，尤其是数据模型、状态机和定位精度过滤规则。

## Definition of Done

一个任务只有在满足以下条件后才能标记为完成：

- 已实现代码或配置变更
- 已完成基础自测
- 不阻塞后续任务
- 与对应验收标准一致

## Global Acceptance Criteria

- 用户可以完成一次完整骑行记录闭环
- 定位权限申请和拒绝处理正常
- 时间、速度、距离显示正确且格式统一
- 历史记录支持读取、展示和删除
- 本地存储数据结构与 `RideRecord` 定义一致

## Task Sequence

建议按以下顺序执行：

1. `SETUP`
2. `UTILS`
3. `SERVICE`
4. `HOME`
5. `SUMMARY`
6. `HISTORY`
7. `POLISH`

## Tasks

### SETUP

#### `SETUP-001` 初始化项目页面结构与 TabBar

- Status: `TODO`
- Priority: `P0`
- Depends On: `None`
- Goal: 建立首页和历史页入口，保证小程序可正常导航
- Scope:
  - 配置 `app.json`
  - 设置底部 TabBar：`码表`、`历史`
  - 注册页面路径
- Deliverables:
  - `app.json`
  - 对应页面目录存在且可访问
- Acceptance Criteria:
  - 小程序启动后可进入首页
  - 底部 TabBar 正常显示且可切换到历史页

#### `SETUP-002` 配置定位权限声明

- Status: `TODO`
- Priority: `P0`
- Depends On: `SETUP-001`
- Goal: 满足微信定位能力所需配置
- Scope:
  - 在 `app.json` 中配置 `permission`
  - 配置 `requiredPrivateInfos`
- Deliverables:
  - 合法的小程序权限配置
- Acceptance Criteria:
  - 代码中可正常调用定位相关 API
  - 首次使用时具备清晰的授权说明

#### `SETUP-003` 建立全局样式基础变量

- Status: `TODO`
- Priority: `P2`
- Depends On: `SETUP-001`
- Goal: 提供高对比度、适合骑行场景的全局视觉基础
- Scope:
  - 在 `app.wxss` 中定义颜色、字号、间距等基础变量
- Deliverables:
  - `app.wxss`
- Acceptance Criteria:
  - 页面可复用统一样式变量
  - 视觉风格满足高对比度要求

### UTILS

#### `UTILS-001` 实现距离计算工具

- Status: `TODO`
- Priority: `P0`
- Depends On: `SETUP-001`
- Goal: 基于 Haversine 公式计算两点距离
- Scope:
  - 实现经纬度距离计算
  - 输出单位为 `km`
  - 便于服务层直接调用
- Deliverables:
  - `utils/calculator.js`
- Acceptance Criteria:
  - 可正确计算两点距离
  - 接口输入输出清晰

#### `UTILS-002` 实现格式化工具

- Status: `TODO`
- Priority: `P0`
- Depends On: `SETUP-001`
- Goal: 统一格式化时间、速度、距离展示
- Scope:
  - 时间格式化为 `HH:mm:ss`
  - 速度和距离保留两位小数
- Deliverables:
  - `utils/format.js`
- Acceptance Criteria:
  - 页面展示格式统一
  - 异常输入有合理兜底

#### `UTILS-003` 实现本地存储封装

- Status: `TODO`
- Priority: `P0`
- Depends On: `SETUP-001`
- Goal: 封装骑行记录的读写删逻辑
- Scope:
  - 读取全部记录
  - 追加新记录
  - 删除单条记录
  - 使用固定存储 Key
- Deliverables:
  - `utils/storage.js`
- Acceptance Criteria:
  - 新记录可以持久化保存
  - 历史记录默认按时间倒序返回
  - 删除后列表正确更新

### SERVICE

#### `SERVICE-001` 实现骑行计时器逻辑

- Status: `TODO`
- Priority: `P0`
- Depends On: `UTILS-002`
- Goal: 支持开始、暂停、继续、重置的计时能力
- Scope:
  - 管理计时器生命周期
  - 暂停期间不累计时长
- Deliverables:
  - 服务层计时逻辑模块或页面内独立逻辑
- Acceptance Criteria:
  - 开始后时间正常累加
  - 暂停后时间停止
  - 继续后时间从上次暂停处恢复
  - 重置后恢复初始状态

#### `SERVICE-002` 实现位置监听逻辑

- Status: `TODO`
- Priority: `P0`
- Depends On: `SETUP-002`
- Goal: 接入微信实时定位能力
- Scope:
  - 调用 `wx.startLocationUpdate`
  - 监听 `wx.onLocationChange`
  - 提供启动和停止能力
- Deliverables:
  - 服务层定位逻辑模块或页面内独立逻辑
- Acceptance Criteria:
  - 骑行开始后可接收位置更新
  - 骑行结束后可停止监听
  - 定位失败时有明确错误处理

#### `SERVICE-003` 实现实时数据聚合器

- Status: `TODO`
- Priority: `P0`
- Depends On: `UTILS-001`, `UTILS-002`, `SERVICE-001`, `SERVICE-002`
- Goal: 将定位和计时数据聚合为页面可消费的骑行数据
- Scope:
  - 累计距离
  - 计算当前速度
  - 过滤低速漂移和低质量定位
  - 输出实时状态数据
- Deliverables:
  - 聚合逻辑实现
- Acceptance Criteria:
  - 距离累计逻辑正确
  - 速度单位为 `km/h`
  - 小于 `1 km/h` 的漂移数据被过滤
  - GPS 精度差时可提示或忽略异常点

### HOME

#### `HOME-001` 实现码表首页 UI

- Status: `TODO`
- Priority: `P0`
- Depends On: `SETUP-003`
- Goal: 提供适合骑行中查看的大字码表界面
- Scope:
  - 大字体展示实时速度
  - 网格布局展示时间和里程
  - 预留状态提示区
- Deliverables:
  - `pages/home/home.wxml`
  - `pages/home/home.wxss`
- Acceptance Criteria:
  - 首页核心数据区域清晰可读
  - 移动端显示不拥挤

#### `HOME-002` 实现首页控制交互

- Status: `TODO`
- Priority: `P0`
- Depends On: `HOME-001`, `SERVICE-001`, `SERVICE-002`, `SERVICE-003`
- Goal: 实现开始、暂停、继续、结束的按钮交互和状态切换
- Scope:
  - 根据状态切换按钮文案和可用性
  - 防止非法状态跳转
- Deliverables:
  - `pages/home/home.js`
- Acceptance Criteria:
  - `IDLE`、`RIDING`、`PAUSED` 状态切换正确
  - 结束操作可进入总结页

#### `HOME-003` 绑定实时数据到首页视图

- Status: `TODO`
- Priority: `P0`
- Depends On: `HOME-001`, `HOME-002`
- Goal: 将服务层数据流实时展示在页面上
- Scope:
  - 绑定时间、速度、距离
  - 控制视图刷新频率，避免高频卡顿
- Deliverables:
  - `pages/home/home.js`
- Acceptance Criteria:
  - 数据变化后页面及时更新
  - 高频定位更新下页面仍可流畅显示

#### `HOME-004` 处理定位权限异常

- Status: `TODO`
- Priority: `P0`
- Depends On: `HOME-002`
- Goal: 在授权失败或用户拒绝时提供明确引导
- Scope:
  - 提示授权失败原因
  - 引导用户重新授权
- Deliverables:
  - 首页权限异常处理逻辑
- Acceptance Criteria:
  - 用户拒绝授权时不会进入异常状态
  - 页面可展示清晰提示信息

### SUMMARY

#### `SUMMARY-001` 实现总结页 UI

- Status: `TODO`
- Priority: `P1`
- Depends On: `HOME-002`
- Goal: 展示本次骑行结果摘要
- Scope:
  - 展示总时长、总距离、平均速度
  - 提供保存和取消操作入口
- Deliverables:
  - `pages/summary/summary.wxml`
  - `pages/summary/summary.wxss`
- Acceptance Criteria:
  - 总结数据展示完整
  - 操作入口清晰

#### `SUMMARY-002` 实现保存记录逻辑

- Status: `TODO`
- Priority: `P0`
- Depends On: `SUMMARY-001`, `UTILS-003`
- Goal: 将一次骑行结果保存到本地历史记录
- Scope:
  - 组装 `RideRecord`
  - 写入本地缓存
  - 保存后跳转历史页
- Deliverables:
  - `pages/summary/summary.js`
- Acceptance Criteria:
  - 保存后可在历史页看到新记录
  - 记录字段完整且结构正确

#### `SUMMARY-003` 实现取消与状态清理

- Status: `TODO`
- Priority: `P1`
- Depends On: `SUMMARY-001`
- Goal: 支持放弃保存并回到首页
- Scope:
  - 清空本次骑行临时状态
  - 返回首页
- Deliverables:
  - `pages/summary/summary.js`
- Acceptance Criteria:
  - 取消后不会产生脏数据
  - 返回首页后可重新开始新一轮骑行

### HISTORY

#### `HISTORY-001` 实现历史记录页 UI

- Status: `TODO`
- Priority: `P1`
- Depends On: `SETUP-001`
- Goal: 提供历史骑行记录列表展示
- Scope:
  - 展示日期、时长、距离、平均速度
  - 空状态展示
- Deliverables:
  - `pages/history/history.wxml`
  - `pages/history/history.wxss`
- Acceptance Criteria:
  - 列表信息完整且易读
  - 无记录时页面状态合理

#### `HISTORY-002` 实现历史记录读取与排序

- Status: `TODO`
- Priority: `P0`
- Depends On: `HISTORY-001`, `UTILS-003`
- Goal: 在页面加载时读取本地骑行记录并展示
- Scope:
  - 读取缓存
  - 倒序排列
  - 渲染到页面
- Deliverables:
  - `pages/history/history.js`
- Acceptance Criteria:
  - 最新记录显示在最前面
  - 刷新页面后历史数据仍存在

#### `HISTORY-003` 实现删除单条记录

- Status: `TODO`
- Priority: `P1`
- Depends On: `HISTORY-002`, `UTILS-003`
- Goal: 支持用户删除历史记录
- Scope:
  - 长按或侧滑删除
  - 删除后刷新列表
- Deliverables:
  - `pages/history/history.js`
- Acceptance Criteria:
  - 删除成功后记录不再出现
  - 不影响其他记录

### POLISH

#### `POLISH-001` 优化高频定位下的页面性能

- Status: `TODO`
- Priority: `P1`
- Depends On: `HOME-003`
- Goal: 避免因频繁更新导致页面卡顿
- Scope:
  - 控制 UI 刷新频率
  - 减少不必要的 `setData`
- Deliverables:
  - 首页性能优化代码
- Acceptance Criteria:
  - 连续定位更新下页面响应正常
  - 无明显卡顿或掉帧感

#### `POLISH-002` 完善漂移和精度过滤

- Status: `TODO`
- Priority: `P0`
- Depends On: `SERVICE-003`
- Goal: 提高距离和速度数据可信度
- Scope:
  - 过滤速度小于 `1 km/h` 的漂移数据
  - 过滤低质量定位点
- Deliverables:
  - 聚合逻辑优化
- Acceptance Criteria:
  - 静止场景下不会明显累计虚假距离
  - 异常定位点不会显著污染结果

#### `POLISH-003` 完成 MVP 闭环验收

- Status: `TODO`
- Priority: `P0`
- Depends On: `SUMMARY-002`, `HISTORY-002`
- Goal: 验证 MVP 主流程可正常完成
- Scope:
  - 开始骑行
  - 暂停与继续
  - 结束骑行
  - 保存记录
  - 查看历史
- Deliverables:
  - 一次完整手动验收结果
- Acceptance Criteria:
  - 完整流程无阻塞
  - 关键数据在流程中连续且可读

## Suggested Milestones

### Milestone 1: Project Bootstrapping

- `SETUP-001`
- `SETUP-002`
- `SETUP-003`

### Milestone 2: Core Computation

- `UTILS-001`
- `UTILS-002`
- `UTILS-003`
- `SERVICE-001`
- `SERVICE-002`
- `SERVICE-003`

### Milestone 3: Core User Flow

- `HOME-001`
- `HOME-002`
- `HOME-003`
- `HOME-004`
- `SUMMARY-001`
- `SUMMARY-002`
- `SUMMARY-003`

### Milestone 4: History and Acceptance

- `HISTORY-001`
- `HISTORY-002`
- `HISTORY-003`
- `POLISH-001`
- `POLISH-002`
- `POLISH-003`

## Notes for Task Executors

- 如果执行代理需要开始编码，优先从 `SETUP-001` 按顺序推进，不要跳过 `P0` 任务。
- 如果某项任务依赖未完成，应先补齐依赖，再继续当前任务。
- 每完成一个任务，应同步更新其 `Status`，并记录实际偏差或新增风险。

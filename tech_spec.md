# 技术规范 (Technical Specification) - 骑行码表小程序

## 1. 项目概述
本规范旨在定义“轻量级骑行码表”微信小程序的技术实现细节。该小程序专注于实时骑行数据（速度、距离、时间）的采集、处理与存储。

## 2. 技术栈
- **框架**: 微信小程序原生框架 (WXML, WXSS, JavaScript)
- **定位接口**: 微信地理位置接口 (`wx.onLocationChange`, `wx.startLocationUpdate`)
- **存储**: 微信本地存储 (`wx.setStorage`, `wx.getStorage`)
- **工具库**: 核心逻辑采用纯 JS 编写，不依赖第三方大型库

## 3. 数据模型定义

### 3.1 单次定位数据 (Location Point)
系统通过微信 API 获取的原始点信息。
```typescript
interface LocationPoint {
  latitude: number;   // 纬度
  longitude: number;  // 经度
  speed: number;      // 实时速度 (m/s)
  accuracy: number;   // 精确度 (米)
  timestamp: number;  // 时间戳 (ms)
}
```

### 3.2 骑行记录对象 (Ride Record)
最终保存在本地历史记录中的数据结构。
```typescript
interface RideRecord {
  id: string;               // 唯一标识 (通常使用开始时间的时间戳)
  date: string;             // 骑行日期 (YYYY-MM-DD HH:mm)
  startTime: number;        // 开始时间戳 (ms)
  endTime: number;          // 结束时间戳 (ms)
  totalDuration: number;    // 总骑行时长 (秒，不含暂停时间)
  totalDistance: number;    // 总行驶距离 (公里)
  avgSpeed: number;         // 平均速度 (km/h)
  maxSpeed: number;         // 最高速度 (km/h)
}
```

## 4. 核心逻辑与算法

### 4.1 距离计算 (Haversine Formula)
由于经纬度是在球面上，计算两点间距离需使用半正矢公式：
- **公式**: 
  $a = \sin^2(\Delta\varphi/2) + \cos \varphi_1 \cdot \cos \varphi_2 \cdot \sin^2(\Delta\lambda/2)$
  $c = 2 \cdot \operatorname{atan2}(\sqrt{a}, \sqrt{1-a})$
  $d = R \cdot c$ (其中 $R = 6371$ km)
- **精度过滤**: 仅当单次位移 $d > 0.002$ km (2米) 且定位精度 `accuracy < 30` 时，才计入总距离，以减少静止时的信号漂移（Drift）。

### 4.2 速度转换
- 微信 API 返回的 `speed` 单位为 `m/s`。
- **转换公式**: $V_{km/h} = V_{m/s} \times 3.6$。
- **平均速度**: $V_{avg} = \text{totalDistance} / (\text{totalDuration} / 3600)$。

### 4.3 计时器逻辑
- 采用 `setInterval` 每 1000ms 更新一次页面显示。
- **暂停处理**: 暂停时销毁计时器或停止累加变量；继续时重新启动。

## 5. 状态机管理
小程序的核心骑行逻辑应遵循以下状态转换：

| 当前状态 | 操作 | 目标状态 | 触发行为 |
| :--- | :--- | :--- | :--- |
| **IDLE** (未开始) | 点击开始 | **RIDING** | 申请权限、启动定位监听、开启计时器 |
| **RIDING** (骑行中) | 点击暂停 | **PAUSED** | 停止更新距离、暂停计时器、记录当前点 |
| **PAUSED** (暂停) | 点击继续 | **RIDING** | 恢复计时器、重新开始累加位移 |
| **RIDING/PAUSED** | 点击结束 | **FINISHED** | 停止定位监听、计算汇总数据、跳转总结页 |

## 6. 存储策略
- **Key**: `RIDE_HISTORY_LIST`
- **操作**: 
  - **写入**: 使用 `Array.unshift()` 将新记录插入数组顶端，确保倒序排列。
  - **读取**: 页面加载时一次性读取，若数据量大（>500条）后续考虑分页或分块读取。
  - **限制**: 微信本地缓存限制为 10MB，MVP 版本单条记录极小，足以支持数千条记录。

## 7. 微信 API 关键配置

### 7.1 app.json 配置
```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "你的骑行位置将用于计算实时速度和行程距离"
    }
  },
  "requiredPrivateInfos": [
    "getLocation",
    "onLocationChange",
    "startLocationUpdate"
  ]
}
```

### 7.2 性能优化
- **频率控制**: 实时定位更新频率较高，UI 层建议通过 `throttle` (节流) 限制渲染频率为 1秒一次，以节省手机电量。
- **后台运行**: MVP版本暂不实现后台持续定位，用户锁屏可能导致记录中断（需在后续版本引入 `startLocationUpdateBackground`）。

## 8. UI/UX 设计规范
- **高对比度**: 骑行环境下光照强，界面背景应以深色/纯白为主，数值字体使用粗体、大字号（如 120pt 渲染速度）。
- **防误触**: “结束骑行”按钮需长按或二次确认，防止骑行过程中误操作。
- **异常反馈**: 当 GPS 信号弱（`accuracy > 50`）时，在界面显著位置提示“GPS 信号弱”。

---

**使用说明**:
1. 将此文档内容复制并保存为项目根目录下的 `tech_spec.md`。
2. 在对话中告诉 Codex：“请参考 `tech_spec.md` 中的‘数据模型定义’和‘核心算法’部分来编写我的 `utils/calculator.js`。”
3. 在实现状态切换时，引用第 5 章的“状态机管理”。
# CyclingComputer MVP Acceptance

## Context

- Date: `2026-04-30`
- Scope: `POLISH-003`
- Target flow:
  1. 开始骑行
  2. 暂停与继续
  3. 结束骑行
  4. 保存记录
  5. 查看历史

## Static Verification

以下内容已经通过代码路径核对完成：

### 1. 开始骑行

- Entry page is `pages/home/home`.
- Home primary action enters `RideSessionService.start()`.
- Timer and location services are both started from the shared session instance.

Code references:
- [miniprogram/pages/home/home.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/pages/home/home.ts:70)
- [miniprogram/services/ride-session.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/services/ride-session.ts:75)

Expected result:
- Home enters `RIDING`.
- Primary button changes from `开始骑行` to `暂停`.
- Secondary button becomes available.

### 2. 暂停与继续

- Home primary action switches `RIDING -> PAUSED -> RIDING`.
- Pause stops timer accumulation and clears current speed display to `0.00`.
- Resume restores timer accumulation and continues session from the previous state.

Code references:
- [miniprogram/pages/home/home.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/pages/home/home.ts:79)
- [miniprogram/services/timer.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/services/timer.ts:33)
- [miniprogram/services/ride-session.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/services/ride-session.ts:92)

Expected result:
- Pause state text becomes `已暂停`.
- Resume state text becomes `骑行中`.
- Time does not grow while paused.

### 3. 结束骑行

- Home secondary action calls `RideSessionService.finish()`.
- Session snapshot is serialized into summary page query params.
- Summary page receives total duration, total distance, average speed, max speed, start time and end time.

Code references:
- [miniprogram/pages/home/home.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/pages/home/home.ts:107)
- [miniprogram/services/ride-session.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/services/ride-session.ts:116)
- [miniprogram/pages/summary/summary.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/pages/summary/summary.ts:43)

Expected result:
- User is navigated to summary page.
- Summary page displays duration, distance and average speed.

### 4. 保存记录

- Summary page builds a `RideRecord` from session query params.
- Save action calls `appendRideRecord(record)`.
- Save success navigates to history tab.

Code references:
- [miniprogram/pages/summary/summary.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/pages/summary/summary.ts:58)
- [miniprogram/utils/storage.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/utils/storage.ts:26)

Expected result:
- Record is saved under `RIDE_HISTORY_LIST`.
- User is switched to `pages/history/history`.

### 5. 查看历史

- History page loads on `onShow()`.
- It reads cached records via `getRideHistoryList()`.
- Records are already sorted by `startTime` descending in storage util before rendering.

Code references:
- [miniprogram/pages/history/history.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/pages/history/history.ts:21)
- [miniprogram/utils/storage.ts](/Users/maoboxuan/work/jackeymm's/CyclingComputer/miniprogram/utils/storage.ts:13)

Expected result:
- Newly saved record appears at the top of the list.

## Manual Acceptance Script

需要在微信开发者工具里执行一次完整点击验证：

1. 打开首页，确认默认显示 `等待开始骑行`。
2. 点击 `开始骑行`。
3. 观察首页按钮切换为 `暂停`，时间开始增长。
4. 点击 `暂停`。
5. 等待 3 秒，确认时间不再增长。
6. 点击 `继续`。
7. 确认时间继续增长。
8. 点击 `结束`。
9. 进入总结页后，点击 `保存记录`。
10. 跳转到历史页，确认新纪录出现在首位。
11. 返回首页，再开始一次骑行后点击 `结束` -> `取消返回`。
12. 确认回到首页后状态被清空，可以正常开始新一轮骑行。

## Acceptance Result

- Static verification: `PASS`
- WeChat DevTools manual execution: `PENDING`

## Notes

- 当前环境无法直接替你操作微信开发者工具，所以这里不能诚实地标记为“已手动验收通过”。
- 这份文档已经把闭环代码路径和手动验收脚本整理好了，适合作为 `POLISH-003` 的交付底稿。

import { formatDistance, formatDuration, formatSpeed } from '../../utils/format'
import { deleteRideRecord, getRideHistoryList, type RideRecord } from '../../utils/storage'

type HistoryListItem = {
  id: string
  date: string
  duration: string
  distance: string
  averageSpeed: string
}

Page({
  data: {
    pageTitle: '骑行历史',
    pageDesc: '查看最近保存的骑行记录。',
    historyList: [] as HistoryListItem[],
    emptyTitle: '还没有骑行记录',
    emptyDesc: '完成一次骑行并保存后，这里会显示你的历史数据。',
  },

  onShow() {
    this.loadHistoryList()
  },

  loadHistoryList() {
    const historyList = getRideHistoryList().map(mapRideRecordToHistoryItem)

    this.setData({
      historyList,
    })
  },

  onTapDeleteRecord(event: WechatMiniprogram.CustomEvent<{ recordId?: string }>) {
    const { recordId } = event.currentTarget.dataset

    if (!recordId) {
      return
    }

    wx.showModal({
      title: '删除记录',
      content: '删除后将无法恢复，确认删除这条骑行记录吗？',
      confirmColor: '#e2681d',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        deleteRideRecord(recordId)
        this.loadHistoryList()

        wx.showToast({
          title: '已删除',
          icon: 'success',
        })
      },
    })
  },
})

const mapRideRecordToHistoryItem = (record: RideRecord): HistoryListItem => {
  return {
    id: record.id,
    date: record.date,
    duration: formatDuration(record.totalDuration),
    distance: formatDistance(record.totalDistance),
    averageSpeed: formatSpeed(record.avgSpeed),
  }
}

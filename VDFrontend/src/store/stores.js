import d3 from './utils/d3-import';


// 创建一个函数来返回 FooterStoreValue 的默认值
export const getFooterStoreDefaultValue = () => {
    return {
      numPoints: 0,
      curZoomTransform: d3.zoomIdentity, // 根据实际需要初始化
      xScale: d3.scaleLinear(), // 根据实际需要初始化
      embeddingName: 'Embedding',
      messageID: 0,
      messageCommand: ''
    };
  };

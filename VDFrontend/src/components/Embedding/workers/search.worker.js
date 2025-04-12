import d3 from '../../../utils/d3-import';
import { config } from '../../../config/config';
import { timeit } from '../../../utils/utils';

const index = new Index();
const DEBUG = config.debug;

/**
 * Handle message events from the main thread
 * @param e Message event
 */
self.onmessage = (e) => {
  // Stream point data
  switch (e.data.command) {
    case 'addPoints': {
      const { points } = e.data.payload;
      addPoints(points);
      break;
    }

    case 'startQuery': {
      const { query, queryID } = e.data.payload;
      searchPoint(query, queryID);
      break;
    }

    default: {
      console.error('Worker: unknown message', e.data);
      break;
    }
  }
};

/**
 * Add new points to the search index
 * @param points New points
 */
const addPoints = (points) => {
  for (const point of points) {
    index.add(point.id, point.prompt);
  }
};

/**
 * Start a query
 * @param query Query string
 * @param queryID Query ID
 */
const searchPoint = (idList) => {



  // 主要是这里，使用的主要是 后端的代码用于检索
  const message = {
    command: 'finishQuery',
    payload: {
      idList
    }
  };
  postMessage(message);
};
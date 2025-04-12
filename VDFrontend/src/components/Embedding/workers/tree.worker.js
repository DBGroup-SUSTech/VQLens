import d3 from '../../../utils/d3-import';
import { config } from '../../../config/config';

const DEBUG = config.debug;

const groupTimeTreeMap = new Map();

/**
 * Handle message events from the main thread
 * @param e Message event
 */
self.onmessage = (e) => {


  // Stream point data
  switch (e.data.command) {
    case 'initQuadtree': {
      const { xRange, yRange, times, groupIDs } = e.data.payload;
      initQuadtree(xRange, yRange, times, groupIDs);

      break;
    }

    case 'updateQuadtree': {
      const points = e.data.payload.points;
      updateQuadtree(points);
      break;
    }

    case 'startQuadtreeSearch': {
      const { x, y, time, groupID, method } = e.data.payload;
      quadtreeSearch(x, y, time, groupID, method);
      break;
    }

    case 'startQuadtreeSearchById': {
      const {point, method } = e.data.payload;
      quadtreeSearchById(point, method);
      break;
    }

    default: {
      console.error('Worker: unknown message', e.data.command);
      break;
    }
  }
};

/**
 * Initialize the quadtree
 * @param xRange [xMin, xMax]
 * @param yRange [yMin, yMax]
 */
const initQuadtree = (xRange, yRange, times, groupIDs) => {
  // Initialize the quadtree contains all the points (group = '', time = '')
  initTimeQuadtrees(xRange, yRange, -1, ['']);

  // Initialize time trees if users have specified times in their embeddings
  if (times.length > 0) {
    if (groupIDs.length > 0) {
      for (const groupID of groupIDs) {
        initTimeQuadtrees(xRange, yRange, groupID, times);
      }
    }

    // Also create time trees cover all groups
    initTimeQuadtrees(xRange, yRange, -1, times);
  }

  // Initialize group trees (these trees are special time trees with the
  // time key set to '')
  if (groupIDs.length > 0) {
    for (const groupID of groupIDs) {
      initTimeQuadtrees(xRange, yRange, groupID, ['']);
    }
  }

  // Notify the main thread
  const message = {
    command: 'finishInitQuadtree',
    payload: null
  };
  postMessage(message);
};

const initTimeQuadtrees = (xRange, yRange, groupID, times) => {
  // Find the correct time tree map under the group level
  let curTimeTreeMap;

  if (groupTimeTreeMap.has(groupID)) {
    curTimeTreeMap = groupTimeTreeMap.get(groupID);
  } else {
    curTimeTreeMap = new Map();
    groupTimeTreeMap.set(groupID, curTimeTreeMap);
  }

  for (const time of times) {
    const curTree = d3
      .quadtree()
      .x(d => d.x)
      .y(d => d.y)
      .cover(xRange[0], yRange[0])
      .cover(xRange[1], yRange[1]);
    curTimeTreeMap.set(time, curTree);
  }
};

/**
 * Add new points to the quadtree
 * @param points New points
 */
const updateQuadtree = (points) => {
  // Add these points to the quadtree after sending them to the main thread
  const allTree = groupTimeTreeMap.get(-1).get('');

  for (const point of points) {
    // Add the point to the tree containing all points
    allTree.add(point);

    // Add the point to the correct group tree and time tree maps
    if (point.time !== undefined) {
      if (point.groupID !== undefined) {
        if (
          groupTimeTreeMap.has(point.groupID) &&
          groupTimeTreeMap.get(point.groupID).has(point.time)
        ) {
          const curTree = groupTimeTreeMap.get(point.groupID).get(point.time);
          curTree.add(point);
        }
      }

      // Add the point to the time tree map regardless of group
      if (groupTimeTreeMap.get(-1).has(point.time)) {
        const curTree = groupTimeTreeMap.get(-1).get(point.time);
        curTree.add(point);
      }
    }

    // Add the point to the group tree regardless of time
    if (point.groupID) {
      if (groupTimeTreeMap.has(point.groupID)) {
        const curTree = groupTimeTreeMap.get(point.groupID).get('');
        curTree.add(point);
      }
    }
  }
};


/**
 * Find the closest data point
 * @param x X coordinate in the data space
 * @param y Y coordinate in the data space
 * @returns The closest point to (x, y) in the quadtree
 */
const quadtreeSearch = (x, y, time, groupID, method) => {

  if (groupTimeTreeMap.has(groupID)) {
    if (groupTimeTreeMap.get(groupID).has(time)) {
      const curTree = groupTimeTreeMap.get(groupID).get(time);

      const closestPoint = curTree.find(x, y);
      if (closestPoint === undefined) {
        return;
      }
      let result = {};

      if(method === "id"){
        result = {
          command: 'finishQuadtreeSearchById',
          payload: {
            point: closestPoint,
          }
        };
        console.log("执行的 id 搜索")
      }else{
        result = {
          command: 'finishQuadtreeSearch',
          payload: {
            point: closestPoint,
          }
        };
        console.log("非 id 搜索")

      }
      console.log("closestPoint---------------", closestPoint, result);
      postMessage(result);
    }
  }
};

const quadtreeSearchById = (point, method) => {

      const searchPoint = point;
      if (searchPoint === undefined) {
        return;
      }
      let result = {};

      if(method === "id"){
        result = {
          command: 'finishQuadtreeSearchById',
          payload: {
            point: searchPoint,
          }
        };
        console.log("执行的 id 搜索")
      }

      postMessage(result);
    
  
};


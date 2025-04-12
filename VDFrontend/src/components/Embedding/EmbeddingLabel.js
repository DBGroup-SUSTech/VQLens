
import { timeit, rectsIntersect } from '../../utils/utils';

import d3 from '../../utils/d3-import';
import { config } from '../../config/config';
import { computePosition, flip, shift, offset, arrow } from '@floating-ui/dom';

const IDEAL_TILE_WIDTH = 35;
const LABEL_SPLIT = '-';
let labelMouseenterTimer = null;
let labelMouseleaveTimer = null;


export const updatePopperTooltip = (tooltip, anchor, text, placement) => {
    // 如果文本太长则截断
    if (text.length > 300) {
        text = text.slice(0, 300);
        text = text.slice(0, text.lastIndexOf(' '));
        text = text.concat('...');
    }

    const arrowElement = tooltip.querySelector('.popper-arrow');
    const contentElement = tooltip.querySelector('.popper-content');
    contentElement.innerHTML = text;

    computePosition(anchor, tooltip, {
        placement: placement,
        middleware: [offset(6), flip(), shift(), arrow({ element: arrowElement })]
    }).then(({ x, y, placement, middlewareData }) => {
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;

        const { x: arrowX, y: arrowY } = middlewareData.arrow;
        let staticSide = 'bottom';
        if (placement.includes('top')) staticSide = 'bottom';
        if (placement.includes('right')) staticSide = 'left';
        if (placement.includes('bottom')) staticSide = 'top';
        if (placement.includes('left')) staticSide = 'right';

        arrowElement.style.left = arrowX ? `${arrowX}px` : '';
        arrowElement.style.top = arrowY ? `${arrowY}px` : '';
        arrowElement.style.right = '';
        arrowElement.style.bottom = '';
        arrowElement.style[staticSide] = '-4px';
    });
};

function roundRect(ctx, x, y, width, height, r) {
    const radius = {
        tl: 0,
        tr: 0,
        br: 0,
        bl: 0
    };

    if (typeof r === 'number') {
        radius.tl = r;
        radius.tr = r;
        radius.br = r;
        radius.bl = r;
    } else {
        radius.tl = r[0];
        radius.tr = r[1];
        radius.br = r[2];
        radius.bl = r[3];
    }

    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius.br,
        y + height
    );
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}

export function redrawTopicGrid(that, strokeColor = null) {

    const topicCtxs = that.topicCanvases.map(
        c => c.node().getContext('2d')
    );

    for (const topicCtx of topicCtxs) {
        topicCtx.setTransform(1, 0, 0, 1, 0, 0);
        topicCtx.clearRect(0, 0, that.svgFullSize.width, that.svgFullSize.height);
        topicCtx.translate(that.curZoomTransform.x, that.curZoomTransform.y);
        topicCtx.scale(that.curZoomTransform.k, that.curZoomTransform.k);
    }


    drawTopicGrid(that, strokeColor);
}


export function drawTopicGrid(that, strokeColor = null) {
    if (!that.showGrid) return;

    // Choose the topic tree level based on the current zoom level
    const idealTreeLevel = getIdealTopicTreeLevel(that);
    if (idealTreeLevel === null) return;

    // Crossfade two canvas elements if tree level changes
    if (that.lastGridTreeLevels.length > 0) {
        const lastLevel = that.lastGridTreeLevels[that.lastGridTreeLevels.length - 1];


        // Tree level changes
        if (idealTreeLevel !== lastLevel) {
            // Fade the last canvas
            that.topicCanvases[lastLevel % 2]
                .classed('faded', true)
                .on('transitionend', () => {
                    if (that.lastGridTreeLevels[0] === lastLevel) {
                        // No need to draw this faded canvas
                        that.lastGridTreeLevels.shift();
                    }
                });

            // Show the current canvas
            that.topicCanvases[idealTreeLevel % 2].classed('faded', false);

            // Track this new level
            that.lastGridTreeLevels.push(idealTreeLevel);

            // The stack only tracks two levels
            if (that.lastGridTreeLevels.length > 2) {
                that.lastGridTreeLevels.shift();
            }
        }
    }

    if (that.lastGridTreeLevels.length === 0) {
        that.lastGridTreeLevels.push(idealTreeLevel);
    }

    for (const treeLevel of that.lastGridTreeLevels) {
        const canvas = that.topicCanvases[treeLevel % 2].node();
        const ctx = canvas.getContext('2d');
        if (ctx === null) return;

        const topicTree = that.topicLevelTrees.get(treeLevel);
        const treeExtent = topicTree.extent();
        const tileWidth = (treeExtent[1][0] - treeExtent[0][0]) / Math.pow(2, treeLevel);
        const tileScreenWidth = Math.abs(that.xScale(tileWidth) - that.xScale(0));

        // Only draw the tiles that are visible
        const zoomBox = that.getCurZoomBox();

        const tiles = topicTree
            .data()
            .map(d => {
                const tileRect = {
                    x: that.xScale(d[0] - tileWidth / 2),
                    // x: that.xScale(d[0] - tileWidth / 2) + (that.svgFullSize.width - that.svgFullSize.height) / 2,
                    y: that.yScale(d[1] + tileWidth / 2),
                    width: tileScreenWidth,
                    height: tileScreenWidth,
                    name: `${d[0]}, ${d[1]}`,
                    label: d[2]
                };
                return tileRect;
            })
            .filter(d => rectsIntersect(d, zoomBox));

        // Draw the tiles on a canvas
        ctx.save();

        // Use specified stroke color or default based on contours
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
        } else {
            if (anyTrue(that.showContours)) {
                ctx.strokeStyle = config.gridColorLight;
            } else {
                ctx.strokeStyle = config.gridColorDark;
            }
        }
        ctx.lineWidth = 1 / (4 * that.curZoomTransform.k);

        for (const tile of tiles) {
            ctx.moveTo(tile.x, tile.y);
            roundRect(ctx, tile.x, tile.y, tile.width, tile.height, 4 / that.curZoomTransform.k);
            ctx.stroke();
        }
        ctx.restore();
    }
}

export function getIdealTopicTreeLevel(that) {

    // 根据当前的缩放级别选择最佳的topic树级别进行展示

    if (that.topicLevelTrees.size < 1) return null;

    let bestLevel = -1;
    let bestDistance = Infinity;

    for (const level of that.topicLevelTrees.keys()) {
        const extent = that.topicLevelTrees.get(level).extent();
        const treeViewWidth = extent[1][0] - extent[0][0];
        const tileNum = Math.pow(2, level);
        const tileSize = treeViewWidth / tileNum;
        const scaledTileWidth =
            Math.max(
                that.xScale(tileSize) - that.xScale(0),
                that.yScale(tileSize) - that.yScale(0)
            ) * that.curZoomTransform.k;

        if (Math.abs(scaledTileWidth - IDEAL_TILE_WIDTH) < bestDistance) {
            bestLevel = level;
            bestDistance = Math.abs(scaledTileWidth - IDEAL_TILE_WIDTH);
        }
    }

    return bestLevel;
}


export function mouseoverLabel(that, x, y) {
    // const offx = (that.svgFullSize.width - that.svgFullSize.height) / 2;
    const offx = 0;
    if (!that.showGrid) return;
    if (that.hideHighlights) return;

    const bottomGroup = that.topSvg.select('g.top-content g.topics-bottom');
    const labelGroup = that.topSvg.select('g.top-content g.topics');
    const topGroup = that.topSvg.select('g.top-content g.topics-top');

    const oldBottomRect = bottomGroup.select('rect.highlight-tile');
    const oldTopRect = topGroup.select('rect.highlight-tile');

    const hoverDelay = that.showLabel ? 700 : 300;

    const removeHighlight = () => {
        if (labelMouseleaveTimer !== null) {
            clearTimeout(labelMouseleaveTimer);
            labelMouseleaveTimer = null;
        }

        // Clear the highlight and tooltip in a short delay
        labelMouseleaveTimer = setTimeout(() => {
            labelGroup.classed('faded', false);
            oldTopRect.interrupt('top-fade').remove();
            oldBottomRect.remove();
            that.tooltipBottom.classList.add('hidden');
            labelMouseleaveTimer = null;
        }, 50);
    };

    // Remove the tile if x and y are null
    if (x === null || y === null) {
        removeHighlight();
        return;
    }

    // Get the coordinate in the embedding coordinate
    const x0 = that.xScale.invert(that.curZoomTransform.invertX(x));
    const y0 = that.yScale.invert(that.curZoomTransform.invertY(y));

    // Get the corresponding tree
    const idealTreeLevel = getIdealTopicTreeLevel(that);
    const tree = that.topicLevelTrees.get(idealTreeLevel);
    const treeExtent = tree.extent();
    const tileWidth = (treeExtent[1][0] - treeExtent[0][0]) / Math.pow(2, idealTreeLevel);
    const tileScreenWidth = Math.abs(that.xScale(tileWidth) - that.xScale(0));

    const radius = Math.sqrt(2) * tileWidth;
    const tile = tree.find(x0, y0, radius);

    // No tile near the mouse location
    if (tile === undefined) {
        if (!oldBottomRect.empty()) {
            removeHighlight();
        }
        return;
    }

    if (oldBottomRect.empty()) {
        // Add a new highlight rect at the bottom layer
        const rect = bottomGroup
            .append('rect')
            .attr('class', 'highlight-tile')
            .attr('x', that.xScale(tile[0]) - tileScreenWidth / 2)
            .attr('y', that.yScale(tile[1]) - tileScreenWidth / 2)
            .attr('width', tileScreenWidth)
            .attr('height', tileScreenWidth)
            .attr('rx', 4 / that.curZoomTransform.k)
            .attr('ry', 4 / that.curZoomTransform.k)
            .style('stroke-width', 2.6 / that.curZoomTransform.k)
            .style('stroke', anyTrue(that.showContours) ? config.gridColorLight : config.gridColorDark);

        // Show the tooltip
        updatePopperTooltip(that.tooltipBottom, rect.node(), tile[2], 'bottom');

        // Insert a clone to the top layer
        const clone = rect.clone(true).style('stroke', null).remove().node();
        const topRect = d3.select((topGroup.node()).appendChild(clone));

        labelMouseenterTimer = tile[2];
        topRect
            .style('opacity', 0)
            .transition('top-fade')
            .duration(hoverDelay)
            .ease(d3.easeCubicInOut)
            .on('end', () => {
                topRect.style('opacity', 1);
                labelGroup.classed('faded', true);
                that.tooltipBottom.classList.remove('hidden');
                labelMouseenterTimer = null;
            });
    } else {
        // Update the old highlight rect
        oldBottomRect
            .attr('x', that.xScale(tile[0]) - tileScreenWidth / 2)
            .attr('y', that.yScale(tile[1]) - tileScreenWidth / 2)
            .attr('width', tileScreenWidth)
            .attr('height', tileScreenWidth)
            .attr('rx', 4 / that.curZoomTransform.k)
            .attr('ry', 4 / that.curZoomTransform.k)
            .style('stroke-width', 2.6 / that.curZoomTransform.k);

        oldTopRect
            .attr('x', that.xScale(tile[0]) - tileScreenWidth / 2)
            .attr('y', that.yScale(tile[1]) - tileScreenWidth / 2)
            .attr('width', tileScreenWidth)
            .attr('height', tileScreenWidth)
            .attr('rx', 4 / that.curZoomTransform.k)
            .attr('ry', 4 / that.curZoomTransform.k)
            .style('stroke-width', 2.6 / that.curZoomTransform.k);

        // Show the tooltip
        updatePopperTooltip(that.tooltipBottom, oldBottomRect.node(), tile[2], 'bottom');

        if (labelMouseenterTimer === null) {
            that.tooltipBottom.classList.remove('hidden');
        } else {
            labelMouseenterTimer = tile[2];
            oldTopRect
                .interrupt('top-fade')
                .style('opacity', 0)
                .transition('top-fade')
                .duration(hoverDelay)
                .ease(d3.easeCubicInOut)
                .on('end', () => {
                    oldTopRect.style('opacity', 1);
                    labelGroup.classed('faded', true);
                    that.tooltipBottom.classList.remove('hidden');
                    labelMouseenterTimer = null;
                });
        }
    }
}

const anyTrue = (items) => items.reduce((a, b) => a || b, false);
const allTrue = (items) => items.reduce((a, b) => a && b, true);

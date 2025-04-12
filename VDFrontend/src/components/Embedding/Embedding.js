import d3 from '../../utils/d3-import';
import { config } from '../../config/config';
import * as Labeler from './EmbeddingLabel';
import * as PointDrawer from './EmbeddingPointWebGL';


export function displayGroupChanged(that, group) {

    if (group !== undefined) {
        // user have specified groups


        if (that.groupNames.length > 0) {
            const groupIndex = that.groupNames.indexOf(group);


            that.showContours[groupIndex] = true;

            that.svg
                .select(`g.contour-group-${group}`)
                .classed('hidden', !that.showContours[groupIndex]);

            // if (that.showLabel) {
            //     that.layoutTopicLabels(that.userMaxLabelNum, true);
            // }
        } else {
            that.showContours = new Array(that.showContours.length).fill(true);
            const contourGroup = that.svg
                .select('g.contour-group')
                .style('opacity', null)
                .classed('hidden', !that.showContours[0]);

        }
    }

    if (group !== undefined && that.groupNames.length > 0) {
        if (that.groupNames.length < 1) {
            throw Error('groupNames is null');
        }
        // Only show one group's point
        const groupIndex = that.groupNames.indexOf(group);
        that.showPoints[groupIndex] = true;
    } else {
        that.showPoints = new Array(that.showPoints.length).fill(
            true
        );
    }

    that.pointCanvas
        .classed('hidden', !anyTrue(that.showPoints))
        .classed('faded', anyTrue(that.showPoints) && that.showLabel);

    PointDrawer.drawScatterPlot(that);

    if (that.showGrid) Labeler.redrawTopicGrid(that, null);


}

export const anyTrue = (items) => items.reduce((a, b) => a || b);
export const allTrue = (items) => items.reduce((a, b) => a && b);

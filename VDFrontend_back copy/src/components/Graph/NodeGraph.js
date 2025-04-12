
import d3 from "../../utils/d3-import";

export class NodeGraph {
    constructor({
        component,
        data,
        strengths = null,
        width = 300,
        height = 300,
        nodeRadius = 5,
        minLinkStrokeWidth = 1,
        maxLinkStrokeWidth = 6,
        selectedNode = null
    }) {
        this.component = component;
        this.data = data;
        this.padding = {
            top: 5,
            bottom: 5,
            left: 5,
            right: 5
        };
        this.width = width - this.padding.left - this.padding.right;
        this.height = height - this.padding.top - this.padding.bottom;

        this.nodeRadius = nodeRadius;
        this.maxLinkStrokeWidth = maxLinkStrokeWidth;
        this.minLinkStrokeWidth = minLinkStrokeWidth;
        this.initStrengths = strengths;
        this.selectedNode = selectedNode;

        // Deep copy nodes and links from the data object
        this.nodes = data.nodes.map(d => ({ id: d.id }));
        this.links = data.links.map(d => ({ source: d.source, target: d.target }));



        // Construct the color scale
        this.nodeGroups = data.nodes.map(d => d.group);
        if (new Set(this.nodeGroups).size > 10) {
            console.warn('Number of node groups is more than 10.');
        }
        this.colorScale = d3.scaleOrdinal(this.nodeGroups, d3.schemeTableau10);   // 为不同的组别节点分配颜色

        // Construct the edge thickness scale
        this.linkValues = data.links.map(d => d.value || 0);

        if (new Set(this.linkValues).size === 1) {
            this.strokeWidthScale = d3
                .scaleLinear()
                .domain([this.linkValues[0], this.linkValues[0]])
                .range([minLinkStrokeWidth, minLinkStrokeWidth]);
        } else {
            this.strokeWidthScale = d3
                .scaleLinear()
                .domain([Math.min(...this.linkValues), Math.max(...this.linkValues)])
                .range([minLinkStrokeWidth, maxLinkStrokeWidth]);
        }

        // Keep track link counts (used in updating link strength)
        const nodeLinkCounts = [];
        const nodeIDMap = new Map(this.nodes.map((d, i) => [d.id, i]));
        for (const l of this.links) {
            const sourceIndex = nodeIDMap.get(l.source);
            const targetIndex = nodeIDMap.get(l.target);
            nodeLinkCounts[sourceIndex] = (nodeLinkCounts[sourceIndex] || 0) + 1;
            nodeLinkCounts[targetIndex] = (nodeLinkCounts[targetIndex] || 0) + 1;
        }

        this.countNodeLink = (node) => {
            const curIndex = nodeIDMap.get(node.id);
            if (curIndex !== undefined) {
                return nodeLinkCounts[curIndex];
            } else {
                return 0;
            }
        };

        // Initialize the force simulation
        const nodeIDs = data.nodes.map(d => d.id);
        this.forceNode = d3.forceManyBody();
        this.forceLink = d3.forceLink(this.links).id(node => {
            // 确保 node.index 存在
            if (node.index !== undefined) {
                return nodeIDs[node.index];
            }
            return null; // 或者处理没有索引的情况

        });
        this.forceCenter = d3.forceCenter(width / 2, height / 2);
        this.forceCollide = d3
            .forceCollide()
            .radius(d => this.nodeRadius + 0.5)
            .strength(1);

        // Set the initial strengths if they are provided
        if (strengths !== null) {
            if (strengths.linkStrength !== undefined) {
                this.forceLink.strength(link => {
                    return (
                        strengths.linkStrength /
                        Math.min(
                            this.countNodeLink(link.source),
                            this.countNodeLink(link.target)
                        )
                    );
                });
            }

            if (strengths.linkDistance !== undefined) {
                this.forceLink.distance(strengths.linkDistance);
            }
            if (strengths.nodeStrength !== undefined) {
                this.forceNode.strength(strengths.nodeStrength);
            }
            if (strengths.collideStrength !== undefined) {
                this.forceCollide.strength(strengths.collideStrength);
            }

            this.simulation = d3
                .forceSimulation(this.nodes)
                .force('link', this.forceLink)
                .force('charge', this.forceNode)
                .force('center', this.forceCenter)
                .force('collide', this.forceCollide)
                .on('tick', () => this.#ticked());

            // Initialize the SVG element
            this.svg = d3.select(component)
                .append('svg') // 创建一个新的 SVG 元素
                .attr('class', 'graph-svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewbox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'none');



            // Initialize the graph view
            const result = this.drawGraphView();
            this.nodeElements = result.nodeElements;
            this.linkElements = result.linkElements;

            this.handleNodeClick()


        }
    }

    drawGraphView() {
        const content = this.svg
            .append('g')
            .attr('class', 'content')
            .attr('transform', `translate(${this.padding.left}, ${this.padding.top})`);

        // Draw links as lines
        const linkElements = content
            .append('g')
            .attr('class', 'link-group')
            .selectAll('line.link')
            .data(this.links)
            .join('line')
            .attr('class', 'link')
            .attr('x1', d => d.source.x) // 起点 x 坐标
            .attr('y1', d => d.source.y) // 起点 y 坐标
            .attr('x2', d => d.target.x) // 终点 x 坐标
            .attr('y2', d => d.target.y) // 终点 y 坐标
            .style('stroke', 'hsl(0, 0.0%, 74.12%)')
            .style('stroke-opacity', 0.6)
            .style('stroke-width', d => this.strokeWidthScale(this.linkValues[d.index]));

        // 尽量换成一样的颜色
        const groupColorMap = {
                    0: "#FF0000",
                    1: "#A4D3EE",
                    2: "#32CD32",
                    3: "#FF7F50",
                  };

        // Draw nodes as circles
        const nodeElements = content
            .append('g')
            .attr('class', 'node-group')
            .selectAll('circle.node')
            .data(this.nodes)
            .join('circle')
            .attr('class', 'node')
            .attr('r', this.nodeRadius)
            .style('fill', d => groupColorMap[this.nodeGroups[d.index]] || "#A4D3EE") // 移除 `!`
            .style('stroke', 'white')
            .style('stroke-width', 1.5);


        // Initialize the zoom behavior
        const zoomFunction = d3.zoom()
            .scaleExtent([0.5, 5]) // 设置缩放范围
            .on('zoom', (event) => {

                console.log("zoom in and out")
                content.attr('transform', event.transform); // 应用缩放变换
            });

        this.svg.call(zoomFunction);

        // 应用拖拽功能
        nodeElements.call(this.dragFactory()); // 移除 `as d3.Selection<SVGCircleElement, Node, SVGElement, unknown>`

        // Add tooltips for nodes
        nodeElements
            .append('title')
            .text(d => `${d.id}, ${this.nodeGroups[d.index]}`); // 移除 `!`

        return { nodeElements, linkElements };
    }

    handleNodeClick() {
        // 更新选中状态
        if (this.selectedNode === null) {
            return;
        }

        console.log("是否 执行 nodel-link的颜色", this.selectedNode)

        // 更新节点样式，直接选择对应的节点
        this.nodeElements
            .filter(d => d.id === this.selectedNode) // 选择当前选中的节点
            .style('stroke', 'orange') // 设置边框颜色
            .style('stroke-width', 3); // 设置边框宽度

        // 还原未选中节点的样式
        this.nodeElements
            .filter(d => d.id !== this.selectedNode) // 选择未选中的节点
            .style('stroke', 'white') // 恢复边框颜色
            .style('stroke-width', 1.5); // 恢复边框宽度
    }



    /**
   * Always keep nodes in the bounding box
   * @param x
   * @returns new x
   */
    boxBoundX(x) {
        return Math.max(this.nodeRadius, Math.min(this.width - this.nodeRadius, x));
    }

    /**
     * Always keep nodes in the bounding box
     * @param y
     * @returns new y
     */
    boxBoundY(y) {
        return Math.max(this.nodeRadius, Math.min(this.height - this.nodeRadius, y));
    }

    #ticked() {
        // Update node and link positions
        this.linkElements
            .attr('x1', d => {
                const source = d.source; // 移除类型注释
                return source.x ? this.boxBoundX(source.x) : 0; // 移除私有方法标记
            })
            .attr('y1', d => {
                const source = d.source; // 移除类型注释
                return source.y ? this.boxBoundY(source.y) : 0; // 移除私有方法标记
            })
            .attr('x2', d => {
                const target = d.target; // 移除类型注释
                return target.x ? this.boxBoundX(target.x) : 0; // 移除私有方法标记
            })
            .attr('y2', d => {
                const target = d.target; // 移除类型注释
                return target.y ? this.boxBoundY(target.y) : 0; // 移除私有方法标记
            });

        this.nodeElements
            .attr('cx', d => (d.x !== undefined ? this.boxBoundX(d.x) : 0)) // 移除私有方法标记
            .attr('cy', d => (d.y !== undefined ? this.boxBoundY(d.y) : 0)); // 移除私有方法标记
    }

    dragFactory() {
        const dragstarted = (e) => {
            // Restart the simulation if it has already paused
            if (!e.active) {
                this.simulation.alpha(0.3).restart();
            }
            // Init fixed position fx and fy
            e.subject.fx = e.subject.x;
            e.subject.fy = e.subject.y;
        };

        const dragged = (e) => {
            // Move the node to the targeted position using fixed position fx and fy
            e.subject.fx = this.boxBoundX(e.x); // 移除私有方法标记
            e.subject.fy = this.boxBoundY(e.y); // 移除私有方法标记
        };

        const dragended = (e) => {
            // Reset fixed position fx and fy
            e.subject.fx = null;
            e.subject.fy = null;
        };

        return d3
            .drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    updateNodeForceStrength(newStrength) {
        // Update the forces
        this.forceNode.strength(newStrength);

        // Update the simulation
        this.simulation.alpha(0.3).restart();
    }

    updateLinkForceStrength(newStrength) {
        // Update the forces
        this.forceLink.strength((link, i, links) => {
            return (
                newStrength /
                Math.min(
                    this.countNodeLink(link.source), // 移除类型注释
                    this.countNodeLink(link.target)  // 移除类型注释
                )
            );
        });

        // Update the simulation
        this.simulation.alpha(0.3).restart();
    }

    updateLinkForceDistance(newDistance) {
        // Update the forces
        this.forceLink.distance(newDistance);

        // Update the simulation
        this.simulation.alpha(0.3).restart();
    }


    updateCollideForceStrength(newStrength) {
        // Update the forces
        this.forceCollide.strength(newStrength);

        // Update the simulation
        this.simulation.alpha(0.3).restart();
    }

}
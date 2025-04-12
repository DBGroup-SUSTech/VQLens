import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        datasetInfo: {
            "datasetName": "",
            "datasetLength": 0
        },
        datasetName: "",
        modelName: "",
        fileName: "",
        selectedTab: "",
        dataNodeLink: {},
        dataTree: {},
        imageNodeList: [],
        isDone: {
            "DisT": false,
            "NodeL": false,
            "Tree": false,
            "RagG": false
        },
        retrievalSet: {
            "datasetName": "",
            "modelName": "",
            "indexType": "",
            "query": "",
            "topK": 0,
            "valueL": 0,
            "valueK": 0
        },
        reductionSet: {
            "datasetName": "",
            "modelName": "",
            "dimension": "",
            "neighbors": 0,
            "fiter": 0,
            "reductionMethod": "",
            "clusterMethod": ""
        },
        retrievalInfo: [],
        reductionInfo: [],
        clusterInfo: [],
        mainView: "",
        selectedId: -1,
        // 这里设置一个用于表达数据是否高亮状态的对象
        dataHightLighting: [],
        tableData: [],

        updateTable: false,
        gridDensity: {},
        dataURLs: { "point": "", "grid": "" },
        imageDivList: [],

        iconShow: { "contour": false, "points": false, "grid": false, "label": false, "save": false, "trace": true },

        selectedNode: '-1',
        tableFiterResults: [],
    },
    mutations: {
        setFileName(state, payload) {
            state.fileName = payload;
        },
        updateSelectedTab(state, payload) {
            state.selectedTab = payload;
        },
        setDataNodeLink(state, payload) {
            state.dataNodeLink = payload;
        },
        setDataTree(state, payload) {
            state.dataTree = payload;
        },
        setDatasetName(state, payload) {
            state.datasetName = payload;
        },
        setModelName(state, payload) {
            state.modelName = payload;
        },
        setRetrievalSet(state, payload) {
            state.retrievalSet = payload;
        },
        setRetrievaInfo(state, payload) {
            state.retrievalInfo = payload;
        },
        setReductionSet(state, payload) {
            state.reductionSet = payload;
        },
        setReductionInfo(state, payload) {
            state.reductionInfo = payload;
        },
        setIsDone(state, payload) {
            const { key, value } = payload;
            if (Object.prototype.hasOwnProperty.call(state.isDone, key)) {
                state.isDone[key] = value;
            } else {
                console.warn(`Key ${key} does not exist in isDone`);
            }
        },
        setClusterInfo(state, payload) {
            state.clusterInfo = payload;
        },
        setMainView(state, payload) {
            state.mainView = payload;
        },
        setImageNode(state, payload) {
            const { op, nodeId } = payload;

            if (op == "remove") {
                const idx = state.imageNodeList.findIndex(node => node === nodeId)
                state.imageNodeList.splice(idx, 1);
            } else if (op == "add") {
                state.imageNodeList.push(nodeId);
            }
        },
        setSelectedNode(state, payload) {
            if (state.selectedNode === '-1') {
                state.selectedNode = payload;
            } else {
                state.selectedNode = '-1';
            }

        },
        setSelectedId(state, payload) {
            state.selectedId = payload;
        },
        setTableData(state, payload) {
            state.tableData = payload;
        },
        setUpdateTable(state, payload) {
            state.updateTable = payload;
        },
        setGridDensity(state, payload) {
            state.gridDensity = payload;
        },
        setDatasetInfo(state, payload) {
            state.datasetInfo = payload;
        },
        setDataURLs(state, payload) {
            state.dataURLs.point = payload + "data.ndjson";
            state.dataURLs.grid = payload + "grid.json";
        },
        setImageDivList(state, payload) {
            // 将url添加到list 中
            const act = payload.act;
            if (act == "add") {
                state.imageDivList.push(payload.imageUrl);
            } else if (act == "sub") {
                state.imageDivList.pop(payload.imageUrl);
            }
        },
        setIconShow(state, payload) {
            state.iconShow[payload] = !state.iconShow[payload];
        },
        setTableFiterResults(state, payload) {
            state.tableFiterResults = payload;

            // tableFiterResults
        }
    }
});

export default store;
<template>

    <div class="table-main">

        <el-tabs v-model="selectedTabValue" type="card">
            <el-tab-pane v-for="(file, index) in fileList" :key="index" :label="file" :name="file">

                <el-table v-if="tableData" :data=tableData style="width: 100%" height="250" :stripe="true"
                    :border="true" size="mini" type="index" :highlight-current-row="true"
                    @row-click="(row, column, event) => handleRowClick(row, file, event)">


                    <el-table-column v-for="(value, key) in tableData[0]" :key="key" :prop="key" :label="key"
                        height="6px" show-overflow-tooltip fixed>

                        <template #header>
                            <div class="header-wrapper">

                                <div :title="key" class="header-left"
                                    style="height: 20px; display: inline-flex; align-items: center;">
                                    {{ `${key}` }}
                                </div>

                                <i :class="getColumnIcon(key)" class="icon" @click="handleIconClick(key)"
                                    style="margin-left: 10px; font-size: 14px; vertical-align: middle;" />

                                <div v-if="shouldSortColumn(key)" class="sort-icon-container"
                                    style="display: flex;flex-direction: column;height: 20px;align-items: center;justify-content: center">
                                    <!-- 上升排序箭头 -->
                                    <i :class="{ active: isColumnSorted(key, 'ascending') }" class="el-icon-caret-top"
                                        style="width: 15px;height: 15px" @click="sortColumn(key, 'ascending')"></i>
                                    <!-- 下降排序箭头 -->
                                    <i :class="{ active: isColumnSorted(key, 'descending') }"
                                        class="el-icon-caret-bottom" style="margin-top: -5px;width: 15px;height: 15px"
                                        @click="sortColumn(key, 'descending')"></i>
                                </div>

                            </div>
                        </template>

                        <template #default="{ row, column }">

                            <div v-if="isShow && column.property === 'Image'"
                                style="display: flex; justify-content: center; align-items: center;">
                                <img :src="imagePreUrl + row[column.property]" alt="image"
                                    style="width: 100px; height: 100px;" />
                            </div>

                            <div v-else>
                                {{ row[column.property] }}
                            </div>
                        </template>

                    </el-table-column>

                </el-table>


                <div class="controls-container">
                    <!-- 搜索框 -->
                    <div class="search-container">
                        <el-input v-model="searchQuery" placeholder="Keyword Search" @input="handleSearch"
                            style="width: 200px;" suffix-icon="el-icon-search"></el-input>
                    </div>

                    <!-- Pagination -->
                    <el-pagination :current-page="currentPage" :page-size="pageSize" :total="totalPage" small background
                        class="pagination-class" layout="total, prev, pager, next" @current-change="handlePageChange" />
                </div>


            </el-tab-pane>
        </el-tabs>

    </div>

</template>

<script>

import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";
import { onUpdated } from "vue";

export default {
    name: "TableMainView",
    components: {

    },
    data() {
        return {
            selectedTabValue: "None",
            fileList: [],
            fileContent: {},

            currentPage: 1,
            pageData: [],
            pageSize: 10, // Number of items per page
            totalPage: 0,
            sortedData: [],

            imagePreUrl: "",
            isShow: false,

            searchQuery: "",
            filterdData: [],
            sortOrder: "",
            sortCol: ""

        };
    },
    mounted() {

    },
    methods: {

        async getTableInfo(data) {
            const response = await api.getTableContent({ "datasetName": data });
            this.fileList = response["data"]["tableList"]
            this.selectedTabValue = this.fileList[0]
        },
        async getPageData() {
            const response = await api.getPageData({
                "datasetName": this.$store.state.datasetName,
                "fileName": this.selectedTabValue,
                "currentPage": this.currentPage
            });

            this.pageData = response["data"]["pageData"];
            this.totalPage = response["data"]["totalPage"];
            this.imagePreUrl = response["data"]["preBaseUrl"]
            this.$store.commit("setTableData", this.pageData)

        },
        async handleSearch(e) {

            // 如果事件被正确触发，发送请求：
            const response = await api.getFiterData({
                "datasetName": this.$store.state.datasetName,
                "fileName": this.selectedTabValue,
                "currentPage": this.currentPage,
                "queryText": this.searchQuery
            });

            this.filterdData = response["data"]["filterdData"];
            this.$store.commit("setTableData", this.filterdData);
            this.totalPage = response["data"]["totalPage"];
            this.imagePreUrl = response["data"]["preBaseUrl"]

        },
        handlePageChange(page) {
            this.currentPage = page;
        },
        getColumnIcon(col) {

            if (col === "Image") {
                return "el-icon-view";
            }

        },
        shouldSortColumn(col) {

            if (col === "distance") {
                return true;
            } else if (col == "Id" || col == "id") {
                return true;
            }
        },
        isColumnSorted(col, order) {
            return this.sortCol === col && this.sortOrder === order;
        },
        async sortColumn(col, order) {

            // 如果事件被正确触发，发送请求：
            const response = await api.getSortData({
                "datasetName": this.$store.state.datasetName,
                "fileName": this.selectedTabValue,
                "currentPage": this.currentPage,
                "field": col,
                "sortOrder": order
            });

            this.sortedData = response["data"]["sortedData"];
            this.$store.commit("setTableData", this.sortedData);
            this.totalPage = response["data"]["totalPage"];
            this.imagePreUrl = response["data"]["preBaseUrl"]

            this.sortCol = col;
            this.sortOrder = order;

        },
        handleIconClick(col) {
            if (col === "Image") {
                this.isShow = !this.isShow;
            }

        },
        handleRowClick(row, file, e) {
            // 从点击的行中获取到对应数据的 id
            const data_id = row["Id"]
            // 提交给全局我当前选中的node id 从而使得各个视图之间的联动
            this.$store.commit("setSelectedId", data_id)
        }

    },
    computed: {
        ...mapState({
            datasetName: "datasetName",
            tableData: "tableData",
            updateTable: "updateTable"

        })

    },
    watch: {
        datasetName(newVal, oldVal) {

            if (newVal !== oldVal) {
                this.getTableInfo(newVal);
                this.selectedTabValue = "";
            }

        },
        currentPage(newVal, oldVal) {
            if (this.searchQuery == "") {
                if (this.$store.state.datasetName !== "" && this.selectedTabValue != "") {
                    if (this.selectedTabValue) {
                        this.getPageData();
                    }
                }
            } else {
                this.handleSearch();
            }
        },
        selectedTabValue(newVal, oldVal) {
            if (this.$store.state.datasetName !== "") {
                if (this.selectedTabValue) {
                    this.currentPage = 1;
                    this.getPageData();
                }

            }

        },
        updateTable(newVal, oldVal) {
            if (newVal === true) {
                this.getTableInfo(this.$store.state.datasetName);
                this.getPageData();
            }

        }
    }
};
</script>


<style scoped lang="scss">
.table-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}


.controls-container {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 50px;
    /* 给搜索框和分页组件添加间距 */
    margin-top: 2.5px;
}


.search-container {
    margin-left: 20px;
}


.header-wrapper {
    height: 20px;
    white-space: nowrap;
    /*强制单行显示*/
    text-overflow: ellipsis;
    /*超出部分省略号表示*/
    overflow: hidden;
    /*超出部分隐藏*/
    padding: 5px 0;
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    //justify-content: center;
    align-items: center;
    box-sizing: border-box;
    color: #595959;
}

.active {
  color: #e48e41;
}
</style>

<style>
.el-tabs--card>.el-tabs__header {
    padding: 0;
    position: relative;
    margin: 0 0 0px;
    background-color: white;
}

.el-tabs__content {
    overflow: hidden;
    position: relative;
    margin-left: 1.5px;
    padding-bottom: 15px;
    background-color: white;
}
</style>
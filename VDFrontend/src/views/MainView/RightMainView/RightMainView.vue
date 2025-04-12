<template>

    <div class="right-main">

        <div class="header-main">
            <div>

                <el-row class="block-col-2">
                    <el-col :span="12">
                        <el-dropdown @command="handleCommand"
                            :disabled="Object.keys($store.state.dataNodeLink).length == 0">
                            <span class="el-dropdown-link">
                                {{ selectedItem || 'Trace View' }} <i class="el-icon-arrow-down el-icon--right"></i>
                            </span>
                            <el-dropdown-menu slot="dropdown">
                                <el-dropdown-item v-for="item in items" :key="item" :command="item">
                                    {{ item }}
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </el-dropdown>
                    </el-col>
                </el-row>
            </div>

            <img src="@/assets/icon-setting.png" @click="iconClick('setting')" alt="trace" class="header-icon"
                title="Trace">
        </div>

        <div class="trace-all-main">
            <div v-if="selectedItem === 'Graph-Mode'" class="trace-main">
                <node-link-view />
            </div>

            <div v-else-if="selectedItem === 'Tree-Mode'" class="trace-main">
                <tree-view />
            </div>

        </div>
    </div>

</template>

<script>

import { mapState } from "vuex";
import HistoryView from "@/views/MainView/RightMainView/HistoryView.vue";
import NodeLinkView from "@/views/MainView/RightMainView/NodeLinkView.vue";
import TreeView from "@/views/MainView/RightMainView/TreeView.vue";

export default {
    name: "RightMainView",
    components: {
        HistoryView, NodeLinkView, TreeView

    },
    data() {
        return {
            selectedItem: 'Trace View', // 用于存储选中的项
            items: [
                'Graph-Mode',
                'Tree-Mode',
            ],
        };
    },
    methods: {
        handleCommand(command) {
            this.selectedItem = command; // 更新选中的项
        },
        iconClick(command) {
            console.log("click setting icon")

        }
    },

    computed: {
        ...mapState({
            dataNodelink: "dataNodeLink",
        }),
    }
};

</script>

<style scoped lang="scss">
.right-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}

.header-main {
    width: 100%;
    height: 30px;
    display: flex;
    align-items: center;
    background-color: #e0e0e0;
    box-sizing: border-box;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    padding-left: 20px;
}

.trace-all-main {
    height: calc(100% - 30px);
    width: 100%;
    box-sizing: inherit;
}

.trace-main {
    height: 100%;
    width: 100%;
    box-sizing: inherit;
}

.header-icon {
    width: 28px;
    height: 28px;
    box-sizing: border-box;
    cursor: pointer;
    margin-left: 40px;
}

.header-icon:last-child {
    margin-right: 0;
}

.el-dropdown-link {
    cursor: pointer;
    color: black;
}

.el-icon-arrow-down {
    font-size: 12px;
}

.el-dropdown-link {
    white-space: nowrap;
}
</style>
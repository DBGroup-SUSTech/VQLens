import request from "@/utils/request";

export default {
    getDataNames(data) {
        return request({
            url: "/get_data_names",
            method: "post",
            data
        });
    },
    getModelNames(data) {
        return request({
            url: "/get_model_names",
            method: "post",
            data
        });
    },
    getQueryIDs(data) {
        return request({
            url: "/get_query_ids",
            method: "post",
            data
        });
    },
    getSearchIDs(data) {
        return request({
            url: "/get_search_ids",
            method: "post",
            data
        });
    },
    getDataNodeLink(data) {
        return request({
            url: "/get_data_nodes_and_links",
            method: "post",
            data
        });
    },
    getDataTree(data) {
        return request({
            url: "/get_data_tree",
            method: "post",
            data
        });
    },
    getImageUrl(data) {
        return request({
            url: "/get_image_node",
            method: "post",
            data
        });
    },
    getVectorShape(data) {
        return request({
            url: "/get_vector_shape",
            method: "post",
            data
        });
    },
    getBuildAlg(data){
        return request({
            url: "/get_build_alg",
            method: "post",
            data
        });
    },
    getRetrievalRes(data){
        return request({
            url: "/get_retrieval_res",
            method: "post",
            data
        })
    },
    getQueryInfo(data){
        return request({
            url: "/get_query_info",
            method: "post",
            data
        })
    },
    getReductionRes(data){
        return request({
            url: "/get_reduction_res",
            method: "post",
            data
        })
    },
    getTableContent(data){
        return request({
            url: "/get_table_content",
            method: "post",
            data
        })


    },
    getPageData(data){
        return request({
            url: "/get_page_data",
            method: "post",
            data
        })
    },
    getFiterData(data){
        return request({
            url: "get_filter_data",
            method: "post",
            data
        })
    },
    getSortData(data){
        return request({
            url: "get_sort_data",
            method: "post",
            data
        })
    },

};

import { csrfFetch } from './csrf';

//CONSTANTS
const GET_ALL_REPORTS = "reports/GET_ALL_REPORTS";
const GET_TOTAL_REPORTS_AMOUNT = "reports/GET_TOTAL_REPORTS_AMOUNT";
const GET_REPORT = "reports/GET_REPORT";

//ACTION CREATORS
const getAllReports = (reports) => ({
    type: GET_ALL_REPORTS,
    payload: reports,
});

const getTotalReportsAmount = (amount) => ({
    type: GET_TOTAL_REPORTS_AMOUNT,
    payload: amount,
});

const getReport = (report) => ({
    type: GET_REPORT,
    payload: report,
});

//THUNKS
export const getAllReportsThunk = (page, size, search, compatibility) => async (dispatch) => {
    const response = await csrfFetch(`/api/reports?size=${size}&page=${page}&search=${search}&compatible=${compatibility}`);
    const reports = await response.json();
    dispatch(getAllReports(reports));
};

export const getTotalReportsAmountThunk = () => async (dispatch) => {
    const response = await csrfFetch('/api/reports/total');
    const reports = await response.json();
    // console.log("TOTAL REPORTS AMOUNT:", reports);
    dispatch(getTotalReportsAmount(reports));
};

export const getReportThunk = (id) => async (dispatch) => {
    const response = await csrfFetch(`/api/reports/${id}`);
    if (response.ok) {
        const report = await response.json();
        dispatch(getReport(report));
    } else {
        throw new Error("Failed to fetch report");
    }
};

//REDUCER
const initialState = {
    allReports: { reports: [], totalReports: 0 },
    report: null
}

const reportsReducer = (state = initialState, action) => {
    switch (action.type) {
        case GET_ALL_REPORTS:
            return {
                ...state,
                allReports: action.payload,
            }
        case GET_TOTAL_REPORTS_AMOUNT:
            return {
                ...state,
                totalReports: action.payload
            }
        case GET_REPORT:
            return {
                ...state,
                report: action.payload
            }
        default:
            return state;
    }
}

export default reportsReducer;
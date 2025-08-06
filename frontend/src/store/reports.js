import { csrfFetch } from "./csrf";

//CONSTANTS
const LOAD_REPORTS = "reports/LOAD_REPORTS";
const LOAD_REPORT = "reports/LOAD_REPORT";

//ACTION CREATORS
const loadReports = (reports) => ({
    type: LOAD_REPORTS,
    reports
});

const loadReport = (report) => ({
    type: LOAD_REPORT,
    report
});

//THUNKS
export const fetchReports = () => async (dispatch) => {
    const response = await csrfFetch('/api/reports');
    if (response.ok) {
        const reports = await response.json();
        dispatch(loadReports(reports));
    }
};

export const fetchReport = (id) => async (dispatch) => {
    const response = await csrfFetch(`/api/reports/${id}`);
    if (response.ok) {
        const report = await response.json();
        dispatch(loadReport(report));
    }
};

//REDUCER
const initialState = {
    reports: [],
    report: null
};

const reportsReducer = (state = initialState, action) => {
    switch (action.type) {
        case LOAD_REPORTS:
            return {
                ...state,
                reports: action.reports
            };
        case LOAD_REPORT:
            return {
                ...state,
                report: action.report
            };
        default:
            return state;
    }
};

export default reportsReducer;
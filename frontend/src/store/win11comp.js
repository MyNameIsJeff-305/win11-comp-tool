import { csrfFetch } from "./csrf";

//Constants
const SET_COMP = 'win11comp/setComp';

//Action Creators
const setComp = (comp) => ({
    type: SET_COMP,
    payload: comp
});

//Thunks
export const win11compThunk = (comp) => async (dispatch) => {
    const response = await csrfFetch('/api/win11comp', {
        method: 'POST',
        body: JSON.stringify(comp)
    });

    if (response.ok) {
        const data = await response.json();
        dispatch(setComp(data));
    }
}

//Reducer
const initialState = {
    comp: null
};

const win11compReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_COMP:
            return {
                ...state,
                comp: action.payload
            };
        default:
            return state;
    }
};

export default win11compReducer;

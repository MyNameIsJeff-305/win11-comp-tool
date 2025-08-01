import { csrfFetch } from "./csrf";

//Constants
const SET_COMP = 'win11comp/setComp';
const GET_TOKEN = 'win11comp/getToken';

//Action Creators
const setComp = (comp) => ({
    type: SET_COMP,
    payload: comp
});

const getToken = (token) => ({
    type: GET_TOKEN,
    payload: token
})

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

export const getTokenThunk = (id) => async (dispatch) => {
    const response = await csrfFetch('/api/token-auth', {
        method: 'POST',
        body: JSON.stringify({ id })
    });
    if (response.ok) {
        const data = await response.json();
        dispatch(getToken(data.token));
    } else {
        throw new Error('Failed to fetch token');
    }
}

//Reducer
const initialState = {
    comp: null,
    token: ''
};

const win11compReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_COMP:
            return {
                ...state,
                comp: action.payload
            };
        case GET_TOKEN:
            return {
                ...state,
                token: action.payload
            };
        default:
            return state;
    }
};

export default win11compReducer;

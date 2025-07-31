import { csrfFetch } from './csrf';

//Constants
const SET_USER = 'session/setUser';
const LOG_IN = 'session/logIn';
const LOG_OUT = 'session/logOut';
const CREATE_USER = 'session/createUser';
const RESTORE_USER = 'session/restoreUser';

// Action Creators
const setUser = (user) => ({
    type: SET_USER,
    payload: user
});

const logIn = (user) => ({
    type: LOG_IN,
    payload: user
});

const logOut = () => ({
    type: LOG_OUT
});

const createUser = (user) => ({
    type: CREATE_USER,
    payload: user
});

// Thunks
export const restoreUser = () => async (dispatch) => {
    const response = await csrfFetch('/api/session');
    const data = await response.json();
    dispatch(setUser(data.user));
    return response;
};

export const signupThunk = (email, stationName, clientName, password) => async (dispatch) => {
    const response = await csrfFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ email, stationName, clientName, password })
    });
    const data = await response.json();
    dispatch(createUser(data.user));
    return response;
};

export const loginThunk = (email, password) => async (dispatch) => {
    const response = await csrfFetch('/api/session', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    dispatch(logIn(data.user));
    return response;
}

export const logoutThunk = () => async (dispatch) => {
    const response = await csrfFetch('/api/session', {
        method: 'DELETE'
    });
    dispatch(logOut());
    return response;
};

//Reducer
const initialState = { user: null };

const sessionReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_USER:
            return { ...state, user: action.payload };
        case LOG_IN:
            return { ...state, user: action.payload };
        case LOG_OUT:
            return { ...state, user: null };
        case CREATE_USER:
            return { ...state, user: action.payload };
        case RESTORE_USER:
            return { ...state, user: action.payload };
        default:
            return state;
    }
};

export default sessionReducer;
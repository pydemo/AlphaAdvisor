import streamlit as st

def render_search_bar():
    label_col, input_col, btn_col, _ = st.columns([0.03, 0.22, 0.11, 0.64])
    with label_col:
        st.markdown(
            "<div style='display:flex;align-items:center;height:32px;text-align:left;font-size:1rem;'>filter</div>",
            unsafe_allow_html=True
        )
    with input_col:
        filter_value = st.text_input("", value="comm", key="filter", label_visibility="collapsed")
    with btn_col:
        col1, _,col2,_ = st.columns([0.5, 0.9,0.01, 0.5])
        with col1:
            search_clicked = st.button("Search", key="search-btn")
        with col2:
            
            reset_clicked = st.button("❌", key="reset-btn")
    return filter_value, search_clicked, reset_clicked

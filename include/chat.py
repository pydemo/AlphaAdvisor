import streamlit as st

def render_chat():
    st.markdown("### 💬 Chat")
    # Use session state to store chat messages
    if "chat_messages" not in st.session_state:
        st.session_state["chat_messages"] = [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi, how can I help you?"}
        ]
    # Show all queued selections in chat (from capp.py)
    if "chat_selection_queue" in st.session_state:
        for sel in st.session_state["chat_selection_queue"]:
            st.session_state["chat_messages"].append(
                {"role": "assistant", "content": f"Selected: {sel}"}
            )
        st.session_state["chat_selection_queue"].clear()

    # Scrollable chat area with fixed width and height
    chat_container_style = """
        <div style="
            width:320px;
            height:300px;
            overflow-y:auto;
            border:1px solid #ddd;
            border-radius:8px;
            background:#fafafa;
            padding:8px 0 8px 0;
            margin-bottom:8px;
        ">
    """
    chat_html = ""
    for msg in st.session_state["chat_messages"]:
        if msg["role"] == "user":
            chat_html += f'<div style="background:#e3f2fd;padding:8px 12px;border-radius:8px;margin-bottom:4px;text-align:left;"><b>User:</b> {msg["content"]}</div>'
        else:
            chat_html += f'<div style="background:#f1f8e9;padding:8px 12px;border-radius:8px;margin-bottom:4px;text-align:left;"><b>Assistant:</b> {msg["content"]}</div>'
    chat_container_style += chat_html + "</div>"
    st.markdown(chat_container_style, unsafe_allow_html=True)

    # Multiline input and Chat button (fixed width to match chat area)
    col1, col2 = st.columns([4, 1])
    with col1:
        user_input = st.text_area("Your message", key="chat_input", label_visibility="collapsed", height=70)
    with col2:
        send_clicked = st.button("Chat", key="chat_send_btn", use_container_width=True)

    if send_clicked and user_input.strip():
        st.session_state["chat_messages"].append({"role": "user", "content": user_input.strip()})
        st.session_state["chat_input"] = ""  # Clear input after sending

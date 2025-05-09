import streamlit as st

def render_chat():
    st.markdown("### 💬 Chat")
    # Use session state to store chat messages
    if "chat_messages" not in st.session_state:
        st.session_state["chat_messages"] = [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi, how can I help you?"}
        ]
    for msg in st.session_state["chat_messages"]:
        if msg["role"] == "user":
            st.markdown(f'<div style="background:#e3f2fd;padding:8px 12px;border-radius:8px;margin-bottom:4px;text-align:left;"><b>User:</b> {msg["content"]}</div>', unsafe_allow_html=True)
        else:
            st.markdown(f'<div style="background:#f1f8e9;padding:8px 12px;border-radius:8px;margin-bottom:4px;text-align:left;"><b>Assistant:</b> {msg["content"]}</div>', unsafe_allow_html=True)

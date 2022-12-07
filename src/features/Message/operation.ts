const Operation = {
    ADD: 'add',
    EDIT_CHAT_LAST_MESSAGE_SENT_AT: 'edit_chat_last_message_sent_at',
    EDIT_MESSAGE_CONTENT: 'edit_message_content',
    EDIT_MESSAGE_IS_EDITED: 'edit_message_is_edited'
} as const;

export default Operation;
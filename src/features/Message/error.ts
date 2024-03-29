type Error =
    | [101] /* can not parse chatID */
    | [102] /* can not parse content */
    | [103] /* can not parse threadID */
    | [104] /* can not parse messageID */
    | [105] /* can not parse forwardID */
    | [106] /* can not parse fileID */
    | [107] /* can not parse start */
    | [108] /* can not parse step */
    | [109] /* can not parse orderDirection */
    | [110] /* can not parse search */
    | [201] /* invalid content */
    | [202] /* invalid chatID */
    | [203] /* invalid threadID */
    | [204] /* invalid replyID */
    | [205] /* invalid forwardID */
    | [206] /* invalid fileID */
    | [207] /* message content should be provided from user or forwarding message */
    | [208] /* invalid id */
    | [209] /* invalid order direction */
    | [210] /* invalid step */
    | [211] /* chatID and threadID can not be undefined */
    | [212] /* invalid search */
    | [213] /* can not search message in chat and thread at the sametime */
    | [301] /* chat does not exist or user is not a member */
    | [302] /* thread does not exist */
    | [303] /* message does not exist */
    | [304] /* forwarding message does not exist */
    | [305] /* file does not exist */
    | [306] /* message is not editable or deletable */
    | [307] /* user is not permitted to see this message */
    | [401, unknown];

export default Error;
type Error =
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
    | [301] /* chat does not exist or user is not a member */
    | [302] /* thread does not exist */
    | [303] /* message does not exist */
    | [304] /* forwarding message does not exist */
    | [305] /* file does not exist */
    | [401, unknown];

export default Error;
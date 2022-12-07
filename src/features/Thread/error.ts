type Error =
    | [201] /* invalid title */
    | [202] /* invalid chatID */
    | [203] /* invalid threadID */
    | [301] /* chat does not exist or user is not a member */
    | [302] /* chat does not exist or user is not the owner */
    | [401, unknown];

export default Error;
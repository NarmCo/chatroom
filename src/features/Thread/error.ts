type Error =
    | [101] /* can not parse chatID */
    | [102] /* can not parse title */
    | [103] /* can not parse id */
    | [104] /* can not parse start */
    | [105] /* can not parse step */
    | [201] /* invalid title */
    | [202] /* invalid chatID */
    | [203] /* invalid threadID */
    | [301] /* chat does not exist or user is not a member */
    | [302] /* chat does not exist or user is not the owner */
    | [401, unknown];

export default Error;
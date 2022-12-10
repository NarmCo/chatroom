type Error =
    | [101] /* can not parse title */
    | [102] /* can not parse userIDs */
    | [103] /* can not parse isGroup */
    | [104] /* can not parse id */
    | [105] /* can not parse start */
    | [106] /* can not parse step */
    | [201] /* invalid title */
    | [202] /* invalid userID */
    | [203] /* invalid isGroup */
    | [204] /* invalid id */
    | [205] /* cannot have multiple users in private chat */
    | [206] /* owner can not be in userIDs */
    | [301] /* chat does not exist or you are not the owner */
    | [302] /* can not add or remove member from private chat or change its title */
    | [303] /* user already in group */
    | [304] /* removing user is not member of this group */
    | [401, unknown];

export default Error;
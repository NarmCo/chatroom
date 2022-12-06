type Error =
    | [201] /* invalid title */
    | [202] /* invalid userID */
    | [203] /* invalid isGroup */
    | [204] /* invalid id */
    | [301] /* chat does not exist or you are not the owner */
    | [302] /* can not add or remove member from private chat or change its title */
    | [303] /* user already in group */
    | [304] /* removing user is not member of this group */
    | [401, unknown];

export default Error;
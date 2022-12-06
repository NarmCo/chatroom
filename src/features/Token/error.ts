type Error =
    | [201] /* invalid username */
    | [202] /* invalid password */
    | [203] /* invalid secret */
    | [301] /* username not found */
    | [302] /* password not match */
    | [305] /* max_session_number limit reached */
    | [306] /* token not found */
    | [307] /* extend_minimum_life limit */
    | [308] /* token expired */
    | [309] /* isAdmin permission denied */
    | [401, unknown] /* db error */

export default Error;
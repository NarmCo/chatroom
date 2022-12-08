type Error =
    | [101] /* can not parse username */
    | [102] /* can not parse password */
    | [103] /* can not parse name */
    | [104] /* can not parse fileID */
    | [105] /* can not parse phone */
    | [106] /* can not parse id */
    | [107] /* can not parse get options */
    | [108] /* can not parse isAdmin */
    | [109] /* can not parse password */
    | [110] /* can not parse userID */
    | [111] /* can not parse add permission */
    | [112] /* can not parse edit permission */
    | [113] /* can not parse remove permission */
    | [114] /* can not parse get permission */
    | [115] /* can not parse permission */
    | [201] /* invalid id */
    | [202] /* invalid username */
    | [203] /* invalid password */
    | [204] /* invalid name */
    | [205] /* invalid fileID */
    | [206] /* invalid phone */
    | [207] /* at least one change is required */
    | [208] /* user ids filter length is zero */
    | [209] /* duplicate user id */
    | [210] /* at least one permission is required */
    | [211] /* invalid partial email */
    | [212] /* invalid partial phone */
    | [301] /* permission denied */
    | [306] /* can not find user */
    | [401, unknown]; /* db error */

export default Error;

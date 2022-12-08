type Error =
    | [101] /* can not parse file */
    | [102] /* can not parse id */
    | [201] /* invalid file type */
    | [202] /* invalid id */
    | [401, unknown];

export default Error;
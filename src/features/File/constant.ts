const FileTypes = {
    document: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'application/pdf', // pdf
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'application/msword', // doc
        'text/plain', // txt
        'application/octet-stream',
        'text/csv',
        'text/html'
    ],
    image: [
        'image/bmp',
        'image/jpeg',
        'image/x-png',
        'image/png',
        'image/gif',
        'image/svg+xml'
    ],

};

export { FileTypes };
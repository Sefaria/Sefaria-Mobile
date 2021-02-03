export default () => ({
    log: jest.fn(x => console.log(x)),
    recordError: jest.fn(x => console.error(x)),
    error: jest.fn(x => console.error(x)),
})

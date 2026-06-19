fn main() {
    let client = reqwest::blocking::Client::builder().build().unwrap();
    match client.post("http://172.31.0.245/api.shtml")
        .header("Content-Type", "application/json")
        .body("{\"cmd\":3,\"gw_id\":\"GW_02_MOCK\",\"dev_id\":\"TAP_MOCK_1\"}")
        .send() {
        Ok(res) => println!("Success: {:?}", res.text()),
        Err(e) => println!("Error: {:?}", e),
    }
}

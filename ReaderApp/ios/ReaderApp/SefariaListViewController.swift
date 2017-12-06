import UIKit

class SefariaListViewController: UITableViewController {

  var uitv: UITableView!

  override func numberOfSections(in tableView: UITableView) -> Int {
    return 3
  }

  override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return 5
  }

  override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
    return "Section \(section)"
  }

  override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "LabelCell", for: indexPath)
    cell.textLabel?.text = "Section \(indexPath.section) Row \(indexPath.row)"
    return cell
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    uitv.dataSource = self
    uitv.delegate = self
    uitv.register(UITableViewCell.self, forCellReuseIdentifier: "customcell")
  }

  func addTableView(_ uitv: UITableView) {
    self.uitv = uitv
    uitv.dataSource = self
    uitv.delegate = self
    uitv.register(UITableViewCell.self, forCellReuseIdentifier: "customcell")
    print("Successfully added table view!")
  }
}

// import componente
import ButtonGroup from "./components/ButtonGroup";
import Alert from "./components/Alert";
import Dropzone from "./components/Dropzone";
import Form from "./components/Form";
import Stiri from "./components/Stiri";

// grafica generala
import "./App.css";

// import extern
import { useState, useEffect, useRef } from "react";
import { Chart as ChartJS } from "chart.js/auto";
import { useAuth } from "./AuthProvider";
import { Line } from "react-chartjs-2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// referinta data
let dateNow = new Date();

// referinta server
const path = "localhost";

// grafica pentru line charts
const propGrafica = (
  titleStat: string,
  timePeriod: string,
  targetValue?: number,
  isQuarterly: boolean = false
) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: !isQuarterly,
        title: {
          display: true,
          text: titleStat,
          color: "#ba8bd3",
        },
        ticks: {
          color: "#ba8bd3",
        },
        grid: {
          color: "#ba8bd3",
        },
      },
      x: {
        title: {
          display: true,
          text: isQuarterly
            ? `Săptămânile trimestrului ${timePeriod}`
            : `Zilele lunii ${timePeriod}`,
          color: "#ba8bd3",
        },
        ticks: {
          color: "#ba8bd3",
        },
        grid: {
          color: "#ba8bd3",
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#ba8bd3",
          font: {
            size: 14,
            weight: "bold",
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
  };
};

// limitari in functie de rol
const geStatsByRole: Record<string, string[]> = {
  "Process Engineer": [
    "GE",
    "Production hours",
    "Minor Stoppages",
    "Breakdowns",
    "Quality Loss",
  ],
};

// props pentru alegerea lunii
interface MonthlyDataEntry {
  date: string | number;
  operatie: string;
  valoare: string;
}

// props pentru json target
interface Target {
  operation: string;
  target: number;
}

function App() {
  // useState-urile pentru a evidentia sau ignora elemente
  const [loading, setLoading] = useState(false);
  const [cardsData, setCardsData] = useState<any[]>([]);
  const [alertVisible, setAlertVisiblity] = useState(false);

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [selectedInitial, setSelectedInitial] = useState<string | null>(null);
  const [selectedGraph, setSelectedGraph] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedLogViewer, setSelectedLogViewer] = useState<string | null>(
    null
  );
  const [logViewerData, setLogViewerData] = useState<any[]>([]);
  const [selectedLogDate, setSelectedLogDate] = useState<string | null>(null);
  const [showLogDateForm, setShowLogDateForm] = useState(false);

  const [selectedHeader, setSelectedHeader] = useState<string | null>(null);
  const [headerPopupData, setHeaderPopupData] = useState<any[]>([]);
  const [ignoreH4, setIgnoreH4] = useState(false);
  const [showHeaderPopup, setShowHeaderPopup] = useState(false);
  const [showBOSTable, setShowBOSTable] = useState(false);

  // useState pentru fiecare graph + target, bos
  const [chartDataGE, setChartDataGE] = useState<any>(null);
  const [chartDataVolume, setChartDataVolume] = useState<any>(null);
  const [chartDataWaste, setChartDataWaste] = useState<any>(null);
  const [chartDataSpeed, setChartDataSpeed] = useState<any>(null);
  const [bosData, setBosData] = useState<any[]>([]);
  const [nmData, setNmData] = useState<any[]>([]);
  const [productionPlanData, setProductionPlanData] = useState<any[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  // useState pentru ignorare
  const [notIgnore, setNotIgnore] = useState(false);

  // useState raport nou
  const [newRaport, setNewRaport] = useState({
    tip: "",
    tipSecundar: "",
    oraIn: "",
    oraOut: "",
    zona: "",
    masina: "",
    ansamblu: "",
    problema: "",
  });

  // useState pentru date
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showDateForm, setShowDateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showMonthForm, setShowMonthForm] = useState(false);
  const [selectedMonthInput, setSelectedMonthInput] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // adaugare comentarii pentru pdf

  // functie de extragere timp
  function extractHourMinute(dateTimeString: string): string {
    try {
      // Parse the date string
      const date = new Date(dateTimeString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date string");
      }

      // Extract hours and minutes
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      // Return formatted time
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error("Error parsing date:", error);
      return "00:00"; // Default fallback
    }
  }

  // contor backend, printare
  const first = useRef(false);
  const printRef = useRef(null);

  // breadcrumbs logic
  const Breadcrumbs = () => {
    const breadcrumbItems = [];

    // Home is always first
    if (selectedInitial) {
      breadcrumbItems.push(
        <span
          onClick={() => {
            setSelectedInitial(null);
            setSelectedPosition(null);
            setSelectedDataset(null);
            setSelectedGraph(null);
            setSelectedTime(null);
            setSelectedQuarter(null);
            setShowDateForm(false);
            setShowMonthForm(false);
          }}
          className="text-breadcrumb hover:text-[#2E4053]"
        >
          Acasă
        </span>
      );
    }

    if (selectedPosition) {
      breadcrumbItems.push(<> • </>);
      breadcrumbItems.push(
        <span
          onClick={handleBackToPositions}
          className="text-breadcrumb hover:text-[#2E4053]"
        >
          Pozitii
        </span>
      );
    }

    if (selectedDataset) {
      breadcrumbItems.push(<> • </>);
      breadcrumbItems.push(
        <span
          onClick={handleBackToDatasets}
          className="text-breadcrumb hover:text-[#2E4053]"
        >
          Functii
        </span>
      );
    }
    if (selectedTime || selectedMonth) {
      breadcrumbItems.push(<> • </>);
      breadcrumbItems.push(
        <span
          onClick={() => {
            setSelectedGraph(null),
              setSelectedMonth(null),
              setSelectedTime(null);
          }}
          className="text-breadcrumb hover:text-[#2E4053]"
        >
          Unitate Timp
        </span>
      );
    }
    if (selectedGraph) {
      breadcrumbItems.push(<> • </>);
      breadcrumbItems.push(
        <span
          onClick={() => {
            setSelectedGraph(null);
          }}
          className="text-breadcrumb hover:text-[#2E4053]"
        >
          Graph
        </span>
      );
    }
    if (selectedInitial) {
      return <div className="breadcrumbs-container ">{breadcrumbItems}</div>;
    } else return null;
  };

  // fetch general backend
  const firstFetch = async () => {
    try {
      // apel backend efectiv
      const res = await fetch(`http://${path}:5000/run-script`);
      if (!res.ok) throw new Error("Eroare la rularea scriptului");
      const data = await res.json();
      console.log("Rezultat script", data);
    } catch (err) {
      console.error("Eroare:", err);
    }
  };

  // Add this function to handle header clicks
  const handleHeaderClick = async (header: string, date: string) => {
    const validHeaders = [
      "Breakdowns",
      "Minor Stoppages",
      "Operational Losses",
    ];

    if (!validHeaders.includes(header)) {
      return;
    }

    setSelectedHeader(header);
    setLoading(true);

    try {
      const dateObj = new Date(date);
      const dateFormatted = dateObj
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      const response = await fetch(`http://${path}:5000/data/${dateFormatted}`);

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.status}`);
      }

      const data = await response.json();
      const dateData = data.data;
      var key = header.toLowerCase();
      if (key === "minor stoppages") {
        key = "minor_stoppages";
      } else if (key === "operational losses") {
        key = "operational_losses";
      }
      const section = dateData[key] || [];

      const cardData = section.map((entry: any, index: number) => ({
        header: entry.nume_echipament || `${header} - Entry ${index + 1}`,
        text: `Schimb: ${entry.schimb}\nProdus: ${entry.produs}\nMinute: ${
          entry.minute
        }${entry.comentariu ? `\nComentariu: ${entry.comentariu}` : ""}`,
        rawData: entry, // Keep the raw data for table display
      }));

      setHeaderPopupData(cardData);
      setShowHeaderPopup(true);
    } catch (err) {
      console.error("Error fetching header details:", err);
      setAlertVisiblity(true);
    } finally {
      setLoading(false);
    }
  };

  // Add this popup component function before the return statement
  const HeaderDetailsPopup = () => {
    if (!showHeaderPopup) return null;

    const handleCommentClick = async (index: number) => {
      if (!selectedHeader || !selectedLogDate) return;

      const currentComment = headerPopupData[index]?.rawData?.comentariu || "";

      if (!currentComment || currentComment === "Fără comentariu") {
        // Add new comment
        const comment = prompt("Adaugă un comentariu:");
        if (comment !== null && comment.trim() !== "") {
          await saveComment(index, comment);
        }
      } else {
        // Edit or delete existing comment
        const action = prompt(
          `Comentariu curent: ${currentComment}\n\nIntrodu noul comentariu sau apasă "Cancel" pentru a șterge comentariul existent:`,
          currentComment
        );

        if (action === null) {
          // User pressed Cancel - delete comment
          const confirmDelete = window.confirm(
            "Sigur vrei să ștergi acest comentariu?"
          );
          if (confirmDelete) {
            await saveComment(index, "");
          }
        } else if (action !== currentComment) {
          // User entered a new comment - update it
          await saveComment(index, action);
        }
        // If action === currentComment, user didn't change anything, so do nothing
      }
    };

    const saveComment = async (index: number, comment: string) => {
      try {
        // Update local state
        setHeaderPopupData((prev) =>
          prev.map((card, i) =>
            i === index
              ? {
                  ...card,
                  rawData: {
                    ...card.rawData,
                    comentariu: comment,
                  },
                }
              : card
          )
        );

        // Save to backend
        const dateFormatted = new Date(selectedLogDate!)
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");

        const response = await fetch(
          `http://${path}:5000/update-header-comment`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: dateFormatted,
              headerType: selectedHeader?.toLowerCase().replace(" ", "_"),
              equipmentIndex: index,
              comment: comment,
            }),
          }
        );

        if (!response.ok) throw new Error("Eroare la salvarea comentariului");

        console.log("Comentariu salvat cu succes");
      } catch (err) {
        console.error("Error saving comment:", err);
        alert("Nu s-a putut salva comentariul.");

        // Revert local state on error
        setHeaderPopupData((prev) =>
          prev.map((card, i) =>
            i === index
              ? {
                  ...card,
                  rawData: {
                    ...card.rawData,
                    comentariu:
                      headerPopupData[index]?.rawData?.comentariu || "",
                  },
                }
              : card
          )
        );
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowHeaderPopup(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              Detalii {selectedHeader} - {selectedLogDate}
            </h3>
            <button
              className="close-button"
              onClick={() => setShowHeaderPopup(false)}
            >
              ×
            </button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="loading-container">
                <p>Se încarcă datele...</p>
              </div>
            ) : headerPopupData.length > 0 ? (
              <div className="modal-table-container" id="pdf-container">
                {ignoreH4 && (
                  <h4>
                    {"Detalii   "}
                    {selectedHeader}
                    {"   -   "}
                    {selectedLogDate}
                  </h4>
                )}
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Echipament</th>
                      <th>Schimb</th>
                      <th>Produs</th>
                      <th>Minute</th>
                      <th>Comentariu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headerPopupData.map((card, index) => (
                      <tr key={index} className="modal-table-row">
                        <td>{card.header}</td>
                        <td>{card.rawData?.schimb || "-"}</td>
                        <td>{card.rawData?.produs || "-"}</td>
                        <td>{card.rawData?.minute || "0"}</td>
                        <td
                          className="comment-cell clickable-comment"
                          onClick={() => handleCommentClick(index)}
                          style={{
                            cursor: "pointer",
                            color:
                              !card.rawData?.comentariu ||
                              card.rawData?.comentariu === "Fără comentariu"
                                ? "#6c757d"
                                : "#3b165a",
                            fontStyle:
                              !card.rawData?.comentariu ||
                              card.rawData?.comentariu === "Fără comentariu"
                                ? "italic"
                                : "normal",
                            minWidth: "150px",
                          }}
                          title="Click pentru a adăuga/modifica/șterge comentariu"
                        >
                          {card.rawData?.comentariu || "Fără comentariu"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data-container">
                <p>Nu există date pentru {selectedHeader} în data selectată.</p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-primary"
              onClick={handleExportToPDF}
              disabled={headerPopupData.length === 0}
            >
              📄 Exportă PDF
            </button>
          </div>
        </div>
      </div>
    );
  };

  // old
  // fetch data log viewer
  const fetchSectionManagerProductionData = async (date: string) => {
    setLoading(true);

    try {
      // Format date to YYYYMMDD format expected by backend
      const dateObj = new Date(date);
      const dateFormatted = dateObj
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      console.log("Fetching data for date:", dateFormatted); // Debug log

      const response = await fetch(
        `http://${path}:5000/section-manager-production/${dateFormatted}`
      );

      if (!response.ok) {
        throw new Error(
          `Eroare la descărcarea datelor de producție: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Server response:", data); // Debug log

      // Handle case where no data is found (404 with empty array)
      if (data.status === "error" || !data.data || data.data.length === 0) {
        console.log("No data found for date:", dateFormatted);
        setLogViewerData([]);
        return;
      }

      const productionData = data.data;
      console.log("Production data received:", productionData); // Debug log

      // Format the data for table display
      const formattedData = productionData.map((entry: any, index: number) => ({
        header: `Entry ${index + 1}`,
        text: formatProductionDataForTable(entry),
      }));

      setLogViewerData(formattedData);
    } catch (err) {
      console.error("Fetch error:", err);
      setAlertVisiblity(true);
      setLogViewerData([]);
    } finally {
      setLoading(false);
    }
  };

  // formatare date log viewer
  const formatProductionDataForTable = (entry: any) => {
    const lines = [];

    // aspecte statice
    if (entry.shift) lines.push(`Schimb: ${entry.shift}`);
    if (entry.team_leader_name)
      lines.push(`Team Leader: ${entry.team_leader_name}`);
    if (entry.product_description)
      lines.push(`Produs: ${entry.product_description}`);
    if (entry.volume_produced !== undefined)
      lines.push(
        `Volum produs: ${Number(entry.volume_produced).toFixed(2)} kg`
      );
    if (entry.hours_used !== undefined)
      lines.push(`Ore utilizate: ${entry.hours_used}h`);
    if (entry.production_hours !== undefined)
      lines.push(`Ore producție: ${entry.production_hours}h`);
    if (entry.official_holidays !== undefined)
      lines.push(`Holidays: ${entry.official_holidays}h`);
    if (entry.no_demand !== undefined)
      lines.push(`No Demand: ${entry.no_demand}h`);
    if (entry.force_majeure !== undefined)
      lines.push(`Force Majeure: ${entry.force_majeure}h`);
    if (entry.waste !== undefined)
      lines.push(`Waste: ${Number(entry.waste).toFixed(2)} kg`);
    if (entry.ge !== undefined)
      lines.push(`GE: ${Number(entry.ge * 100).toFixed(2)}%`);

    // aspecte dinamice
    if (entry.minor_stoppages !== undefined)
      lines.push(
        `Minor Stoppages: ${Number(
          (entry.minor_stoppages / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.breakdowns !== undefined)
      lines.push(
        `Breakdowns: ${Number(
          (entry.breakdowns / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.operational_losses !== undefined)
      lines.push(
        `Operational Losses: ${Number(
          (entry.operational_losses / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.labor_management_losses !== undefined)
      lines.push(
        `Labor Management Losses: ${Number(
          (entry.labor_management_losses / (Number(entry.hours_used) * 60)) *
            100
        ).toFixed(2)}%`
      );

    if (entry.line_delays !== undefined)
      lines.push(
        `Line Delays: ${Number(
          (entry.line_delays / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.material_shortages !== undefined)
      lines.push(
        `Material Shortages: ${Number(
          (entry.material_shortages / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.planned_maintenance !== undefined)
      lines.push(
        `Planned Maintenance: ${Number(
          (entry.planned_maintenance / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.planned_autonomous_maintenance !== undefined)
      lines.push(
        `Planned Autonomous Maintenance: ${Number(
          (entry.planned_autonomous_maintenance /
            (Number(entry.hours_used) * 60)) *
            100
        ).toFixed(2)}%`
      );

    if (entry.sanitation !== undefined)
      lines.push(
        `Sanitation: ${Number(
          (entry.sanitation / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.changeovers !== undefined)
      lines.push(
        `Changeovers: ${Number(
          (entry.changeovers / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.planned_stops !== undefined)
      lines.push(
        `Planned Stops: ${Number(
          (entry.planned_stops / (Number(entry.hours_used) * 60)) * 100
        ).toFixed(2)}%`
      );

    if (entry.consumables_replacement !== undefined)
      lines.push(
        `Consumables replacement: ${Number(
          (entry.consumables_replacement / (Number(entry.hours_used) * 60)) *
            100
        ).toFixed(2)}%`
      );

    if (entry.start_finish_production !== undefined)
      lines.push(
        `Start and Finish Production: ${Number(
          (entry.start_finish_production / (Number(entry.hours_used) * 60)) *
            100
        ).toFixed(2)}%`
      );

    return lines.join("\n");
  };

  // Render section manager production table
  const renderProductionLogTable = () => {
    if (logViewerData.length === 0) {
      return <p>Nu există date de producție pentru data selectată.</p>;
    }

    const getRowColor = (
      volume,
      waste,
      ge,
      operationalLosses,
      minorStoppages,
      breakdowns,
      lineDelays,
      laborManagementLosses,
      materialShortages,
      plannedMaintenance,
      plannedAutonomousMaintenance,
      sanitation,
      changeovers,
      plannedStops,
      consumablesReplacement,
      startFinishProduction
    ) => {
      const volumE = parseFloat(volume) || 0;
      const wastE = parseFloat(waste) || 0;
      const gE = parseFloat(ge) || 0;
      const opLosses = parseFloat(operationalLosses) || 0;
      const minorStops = parseFloat(minorStoppages) || 0;
      const breaks = parseFloat(breakdowns) || 0;
      const liDealys = parseFloat(lineDelays) || 0;
      const laManagement = parseFloat(laborManagementLosses) || 0;
      const maShortages = parseFloat(materialShortages) || 0;
      const plMaintenance = parseFloat(plannedMaintenance) || 0;
      const plAutoMaintenance = parseFloat(plannedAutonomousMaintenance) || 0;
      const san = parseFloat(sanitation) || 0;
      const changes = parseFloat(changeovers) || 0;
      const plStops = parseFloat(plannedStops) || 0;
      const consumables = parseFloat(consumablesReplacement) || 0;
      const startFinish = parseFloat(startFinishProduction) || 0;

      const allValues = [
        volumE,
        wastE,
        gE,
        opLosses,
        minorStops,
        breaks,
        liDealys,
        laManagement,
        maShortages,
        plMaintenance,
        plAutoMaintenance,
        san,
        changes,
        plStops,
        consumables,
        startFinish,
      ];

      // Check if any value exceeds thresholds
      const hasRed = allValues.some((value) => {
        if ((waste / volume) * 100 < 5) return false;
        if (value === gE && value < 50) return true;
        if (value !== volumE && value !== wastE && value !== gE && value > 20)
          return true;
        return false;
      });
      const hasYellow = allValues.some((value) => {
        if (value !== volumE && value !== wastE && value !== gE && value > 10)
          return true;
        if (value === gE && value < 60) return true;
      });

      if (hasRed) {
        return "red-row";
      } else if (hasYellow) {
        return "yellow-row";
      }
      return "green-row";
    };

    // Analyze which columns have all zero values
    const shouldShowColumn = (columnName) => {
      return logViewerData.some((card) => {
        const lines = card.text.split("\n");
        const getLineValue = (label) => {
          const line = lines.find((l) => l.startsWith(label));
          const value = line ? line.split(": ")[1] : "0";
          return parseFloat(value) || 0;
        };

        switch (columnName) {
          case "Holidays":
            return getLineValue("Holidays") > 0;

          case "No Demand":
            return getLineValue("No Demand") > 0;

          case "Force Majeure":
            return getLineValue("Force Majeure") > 0;

          case "Material Shortages":
            return getLineValue("Material Shortages") > 0;

          case "Labor Management Losses":
            return getLineValue("Labor Management Losses") > 0;

          case "Line Delays":
            return getLineValue("Line Delays") > 0;

          case "Breakdowns":
            return getLineValue("Breakdowns") > 0;

          case "Minor Stoppages":
            return getLineValue("Minor Stoppages") > 0;

          case "Operational Losses":
            return getLineValue("Operational Losses") > 0;

          case "Waste":
            return getLineValue("Waste") > 0;

          case "Planned Maintenance":
            return getLineValue("Planned Maintenance") > 0;

          case "Planned Autonomous Maintenance":
            return getLineValue("Planned Autonomous Maintenance") > 0;

          case "Sanitation":
            return getLineValue("Sanitation") > 0;

          case "Changeovers":
            return getLineValue("Changeovers") > 0;

          case "Planned Stops":
            return getLineValue("Planned Stops") > 0;

          case "Consumables replacement":
            return getLineValue("Consumables replacement") > 0;

          case "Start and Finish Production":
            return getLineValue("Start and Finish Production") > 0;

          default:
            return true; // Always show other columns
        }
      });
    };

    // Column visibility variables
    const showHolidays = shouldShowColumn("Holidays");
    const showNoDemand = shouldShowColumn("No Demand");
    const showForceMajeure = shouldShowColumn("Force Majeure");
    const showBreakdowns = shouldShowColumn("Breakdowns");
    const showMinorStoppages = shouldShowColumn("Minor Stoppages");
    const showOperationalLosses = shouldShowColumn("Operational Losses");
    const showMaterialShortages = shouldShowColumn("Material Shortages");
    const showLaborManagementLosses = shouldShowColumn(
      "Labor Management Losses"
    );
    const showLineDelays = shouldShowColumn("Line Delays");
    const showWaste = shouldShowColumn("Waste");
    const showPlannedMaintenance = shouldShowColumn("Planned Maintenance");
    const showPlannedAutonomousMaintenance = shouldShowColumn(
      "Planned Autonomous Maintenance"
    );
    const showSanitation = shouldShowColumn("Sanitation");
    const showChangeovers = shouldShowColumn("Changeovers");
    const showPlannedStops = shouldShowColumn("Planned Stops");
    const showConsumablesReplacement = shouldShowColumn(
      "Consumables replacement"
    );
    const showStartFinishProduction = shouldShowColumn(
      "Start and Finish Production"
    );

    return (
      <div className="table-container">
        <table className="production-table">
          <thead>
            <tr>
              {[
                "Schimb",
                "Team Leader",
                "Produs",
                "Volum Produs",
                "Ore Utilizate",
                ...(showHolidays ? ["Holidays"] : []),
                ...(showNoDemand ? ["No Demand"] : []),
                ...(showForceMajeure ? ["Force Majeure"] : []),
                "GE",
                ...(showWaste ? ["Waste"] : []),
                ...(showMinorStoppages ? ["Minor Stoppages"] : []),
                ...(showBreakdowns ? ["Breakdowns"] : []),
                ...(showOperationalLosses ? ["Operational Losses"] : []),
                ...(showMaterialShortages ? ["Material Shortages"] : []),
                ...(showLaborManagementLosses
                  ? ["Labor Management Losses"]
                  : []),
                ...(showLineDelays ? ["Line Delays"] : []),
                ...(showPlannedMaintenance ? ["Planned Maintenance"] : []),
                ...(showPlannedAutonomousMaintenance
                  ? ["Planned Autonomous Maintenance"]
                  : []),
                ...(showSanitation ? ["Sanitation"] : []),
                ...(showChangeovers ? ["Changeovers"] : []),
                ...(showPlannedStops ? ["Planned Stops"] : []),
                ...(showConsumablesReplacement
                  ? ["Consumables replacement"]
                  : []),
                ...(showStartFinishProduction
                  ? ["Start and Finish Production"]
                  : []),
              ].map((header, index) => (
                <th
                  key={index}
                  onClick={() =>
                    selectedLogDate &&
                    handleHeaderClick(header, selectedLogDate)
                  }
                  style={{
                    cursor: [
                      "Breakdowns",
                      "Minor Stoppages",
                      "Operational Losses",
                    ].includes(header)
                      ? "pointer"
                      : "default",
                  }}
                  className={
                    [
                      "Breakdowns",
                      "Minor Stoppages",
                      "Operational Losses",
                    ].includes(header)
                      ? "clickable-header"
                      : ""
                  }
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {logViewerData.map((card, index) => {
              const lines = card.text.split("\n");
              const getLineValue = (label: string) => {
                const line = lines.find((l) => l.startsWith(label));
                return line ? line.split(": ")[1] : "";
              };

              // Get all values for color coding and display
              const ge = getLineValue("GE");
              const volume = getLineValue("Volum produs");
              const operationalLosses = getLineValue("Operational Losses");
              const minorStoppages = getLineValue("Minor Stoppages");
              const breakdowns = getLineValue("Breakdowns");
              const waste = getLineValue("Waste");
              const materialShortages = getLineValue("Material Shortages");
              const laborManagementLosses = getLineValue(
                "Labor Management Losses"
              );
              const lineDelays = getLineValue("Line Delays");
              const plannedMaintenance = getLineValue("Planned Maintenance");
              const plannedAutonomousMaintenance = getLineValue(
                "Planned Autonomous Maintenance"
              );
              const sanitation = getLineValue("Sanitation");
              const changeovers = getLineValue("Changeovers");
              const plannedStops = getLineValue("Planned Stops");
              const consumablesReplacement = getLineValue(
                "Consumables replacement"
              );
              const startFinishProduction = getLineValue(
                "Start and Finish Production"
              );

              const rowClass = getRowColor(
                volume,
                waste,
                ge,
                operationalLosses,
                minorStoppages,
                breakdowns,
                lineDelays,
                laborManagementLosses,
                materialShortages,
                plannedMaintenance,
                plannedAutonomousMaintenance,
                sanitation,
                changeovers,
                plannedStops,
                consumablesReplacement,
                startFinishProduction
              );

              const checkNull = (int) => {
                if (
                  getLineValue(int) === "nullh" ||
                  getLineValue(int) === "0.00%" ||
                  getLineValue(int) === "" ||
                  getLineValue(int) === "0.00 kg" ||
                  getLineValue(int) === "NaN%"
                ) {
                  return "-";
                }
                return getLineValue(int);
              };

              return (
                <tr key={index} className={rowClass}>
                  <td>{checkNull("Schimb")}</td>
                  <td>{checkNull("Team Leader")}</td>
                  <td>{checkNull("Produs")}</td>
                  <td>{checkNull("Volum produs")}</td>
                  <td>{checkNull("Ore utilizate")}</td>
                  {showHolidays && <td>{checkNull("Holidays")}</td>}

                  {showNoDemand && <td>{checkNull("No Demand")}</td>}
                  {showForceMajeure && <td>{checkNull("Force Majeure")}</td>}
                  <td>{checkNull("GE")}</td>
                  {showWaste && <td>{checkNull("Waste")}</td>}
                  {showMinorStoppages && (
                    <td>{checkNull("Minor Stoppages")}</td>
                  )}
                  {showBreakdowns && <td>{checkNull("Breakdowns")}</td>}
                  {showOperationalLosses && (
                    <td>{checkNull("Operational Losses")}</td>
                  )}
                  {showMaterialShortages && (
                    <td>{checkNull("Material Shortages")}</td>
                  )}
                  {showLaborManagementLosses && (
                    <td>{checkNull("Labor Management Losses")}</td>
                  )}
                  {showLineDelays && <td>{checkNull("Line Delays")}</td>}
                  {showPlannedMaintenance && (
                    <td>{checkNull("Planned Maintenance")}</td>
                  )}
                  {showPlannedAutonomousMaintenance && (
                    <td>{checkNull("Planned Autonomous Maintenance")}</td>
                  )}
                  {showSanitation && <td>{checkNull("Sanitation")}</td>}
                  {showChangeovers && <td>{checkNull("Changeovers")}</td>}
                  {showPlannedStops && <td>{checkNull("Planned Stops")}</td>}
                  {showConsumablesReplacement && (
                    <td>{checkNull("Consumables replacement")}</td>
                  )}
                  {showStartFinishProduction && (
                    <td>{checkNull("Start and Finish Production")}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // fetch data din excel productie
  const fetchProductionPlanData = async (selectedDate) => {
    setLoading(true);
    try {
      const today = new Date(selectedDate);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayFormatted = Form(today);
      const yesterdayFormatted = Form(yesterday);

      const [todayResponse, yesterdayResponse] = await Promise.all([
        fetch(`http://${path}:5000/data/${todayFormatted}`),
        fetch(`http://${path}:5000/data/${yesterdayFormatted}`),
      ]);

      if (!todayResponse.ok && !yesterdayResponse.ok) {
        throw new Error("Eroare la descărcarea fișierului");
      }

      const cards = [];

      // Process today's data if available
      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        const dateData = todayData.data;
        const productionPlan = dateData.production_plan || [];

        // Take only today's entries (limit to 3 based on current time if needed)
        productionPlan.forEach((entry: any) => {
          const cardData = {
            header: entry.tip_produs || "Production Entry",
            text: `Start Date: ${entry.start_date || ""}\nEnd Date: ${
              entry.end_date || ""
            }\nProduct Type: ${entry.tip_produs || ""}\nGramaj: ${
              entry.gramaj || ""
            }\nPcs/Bax: ${entry.pcs_bax || ""}\nComanda Initiala: ${
              entry.comanda_initiala || ""
            }\nShifturi: ${entry.shifturi || ""}\nOre Productie: ${
              entry.ore_productie || ""
            }`,
            isYesterday: false,
          };
          cards.push(cardData);
        });
      }

      // Process yesterday's data - ONLY last row if it spans into today
      if (yesterdayResponse.ok) {
        const yesterdayData = await yesterdayResponse.json();
        const dateData = yesterdayData.data;
        const productionPlan = dateData.production_plan || [];

        if (productionPlan.length > 0) {
          const lastEntry = productionPlan[productionPlan.length - 1];

          // Check if this entry spans from yesterday to today
          if (lastEntry.start_date && lastEntry.end_date) {
            const startDate = new Date(lastEntry.start_date);
            const endDate = new Date(lastEntry.end_date);
            const isOvernight =
              startDate.getDate() === yesterday.getDate() &&
              endDate.getDate() === today.getDate();

            if (isOvernight) {
              const cardData = {
                header: lastEntry.tip_produs || "Production Entry",
                text: `Start Date: ${lastEntry.start_date || ""}\nEnd Date: ${
                  lastEntry.end_date || ""
                }\nProduct Type: ${lastEntry.tip_produs || ""}\nGramaj: ${
                  lastEntry.gramaj || ""
                }\nPcs/Bax: ${lastEntry.pcs_bax || ""}\nComanda Initiala: ${
                  lastEntry.comanda_initiala || ""
                }\nShifturi: ${lastEntry.shifturi || ""}\nOre Productie: ${
                  lastEntry.ore_productie || ""
                }`,
                isYesterday: true,
              };
              cards.push(cardData);
            }
          }
        }
      }

      console.log("All cards:", cards);
      setProductionPlanData(cards);
    } catch (err) {
      console.error(err);
      setAlertVisiblity(true);
    } finally {
      setLoading(false);
    }
  };

  // fetch data din excel bos
  const fetchBOSData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://${path}:5000/bos-data/`);
      if (!response.ok) throw new Error("Eroare la descărcarea datelor BOS");

      const data = await response.json();
      const bosData = data.data;

      // Create cards in the format expected by your renderBOSTable function
      const cards = [
        {
          header: "Date BOS",
          text: `Actiune Sigura: ${
            bosData.actiuni_sigure || 0
          }\nActiune Nesigura: ${bosData.actiuni_nesigure || 0}`,
        },
      ];

      setBosData(cards);
    } catch (err) {
      console.error(err);
      setAlertVisiblity(true);
    } finally {
      setLoading(false);
    }
  };

  // fetch data din excel bos
  const fetchNMData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://${path}:5000/nm-data/`);
      if (!response.ok) throw new Error("Eroare la descărcarea datelor NM");

      const data = await response.json();
      const nmData = data.data;

      // Create cards in the format expected by your renderBOSTable function
      const cards = [
        {
          header: "Date BOS",
          text: `Near Miss: ${nmData.near_miss || 0}\nConditii Nesigure: ${
            nmData.unsafe_conditions || 0
          }`,
        },
      ];

      setNmData(cards);
    } catch (err) {
      console.error(err);
      setAlertVisiblity(true);
    } finally {
      setLoading(false);
    }
  };

  // functiile cu sideeffect
  useEffect(() => {
    if (selectedPosition === "Line Lead") {
      fetchProductionPlanData(selectedDate);
      fetchBOSData();
      fetchNMData();
    }
  }, [selectedPosition, selectedDate]);
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const response = await fetch("./data/target.json");
        if (!response.ok) throw new Error("Failed to fetch targets");
        const targetData = await response.json();
        setTargets(targetData);
      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };

    fetchTargets();
  }, []);

  // functie fetch date saptamanale
  const fetchWeeklyData = async (quarter: string, graphType: string) => {
    setLoading(true);
    try {
      const response = await fetch("./data/weekly_summary.json");
      if (!response.ok)
        throw new Error("Eroare la descărcarea datelor săptămânale");

      const weeklyData = await response.json();

      // Determine quarter range
      const quarterRanges: { [key: string]: { start: number; end: number } } = {
        Q1: { start: 1, end: 13 },
        Q2: { start: 14, end: 26 },
        Q3: { start: 27, end: 39 },
        Q4: { start: 40, end: 52 },
      };

      const range = quarterRanges[quarter];
      if (!range) throw new Error(`Trimestru invalid: ${quarter}`);

      // Filter data for the selected quarter
      const quarterlyData = weeklyData.filter((item: any) => {
        const weekNumber =
          typeof item.week_number === "string" &&
          item.week_number.includes("-W")
            ? parseInt(item.week_number.split("-W")[1]) // Extract week number from "2024-W01"
            : item.week_number;

        return weekNumber >= range.start && weekNumber <= range.end;
      });

      // Sort data by week number
      quarterlyData.sort((a: any, b: any) => {
        const weekA =
          typeof a.week_number === "string" && a.week_number.includes("-W")
            ? parseInt(a.week_number.split("-W")[1])
            : a.week_number;

        const weekB =
          typeof b.week_number === "string" && b.week_number.includes("-W")
            ? parseInt(b.week_number.split("-W")[1])
            : b.week_number;

        return weekA - weekB;
      });

      // Prepare chart data based on graph type
      const weekLabels: string[] = [];
      const chartValues: number[] = [];
      const pointBackgroundColors: string[] = [];

      quarterlyData.forEach((item: any) => {
        let value = 0;

        switch (graphType) {
          case "GE":
            value = item.ge * 100 || 0;
            break;
          case "Volume Produced":
            value = item.produced_volume || 0;
            break;
          case "Waste":
            value = item.waste || 0;
            break;
          case "Speed Loss":
            value = item.speed_loss || 0;
            break;
          default:
            value = 0;
        }

        // Format week label
        let weekLabel = "";
        if (
          typeof item.week_number === "string" &&
          item.week_number.includes("-W")
        ) {
          weekLabel = item.week_number;
        } else {
          weekLabel = `S${item.week_number}`;
        }

        weekLabels.push(weekLabel);
        chartValues.push(value);

        // Get target value for color coding
        const targetValue = targets.find(
          (t) => t.operation === graphType
        )?.target;
        const isWaste = graphType === "Waste" || graphType === "Speed Loss";

        // Set point color based on target comparison
        if (targetValue === undefined) {
          pointBackgroundColors.push("rgba(21, 233, 56, 1)");
        } else {
          const isGood = isWaste ? value <= targetValue : value >= targetValue;
          pointBackgroundColors.push(
            isGood ? "rgba(21, 233, 56, 1)" : "rgba(255, 99, 132, 1)"
          );
        }
      });

      // Create segment colors - use the RIGHT point's color for each segment
      const segmentColors = pointBackgroundColors.slice(1); // Use colors from index 1 onwards
      const segmentBackgroundColors = segmentColors.map((color) =>
        color.replace("1)", "0.2)")
      );

      // Create chart configuration
      const chartConfig = {
        labels: weekLabels,
        datasets: [
          {
            label: graphType,
            data: chartValues,
            borderColor: (ctx: any) => {
              // For the segment between point i and i+1, use the color of point i+1 (right point)
              if (
                ctx.p0DataIndex !== undefined &&
                ctx.p0DataIndex < segmentColors.length
              ) {
                return segmentColors[ctx.p0DataIndex];
              }
              return "rgba(157, 6, 208, 1)"; // Fallback color
            },
            backgroundColor: (ctx: any) => {
              // For the segment between point i and i+1, use the background color of point i+1
              if (
                ctx.p0DataIndex !== undefined &&
                ctx.p0DataIndex < segmentBackgroundColors.length
              ) {
                return segmentBackgroundColors[ctx.p0DataIndex];
              }
              return "rgba(174, 128, 189, 0.2)"; // Fallback color
            },
            pointBackgroundColor: pointBackgroundColors,
            pointBorderColor: pointBackgroundColors,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
            segment: {
              borderColor: (ctx: any) => {
                // For the segment between point i and i+1, use the color of point i+1
                if (
                  ctx.p0DataIndex !== undefined &&
                  ctx.p0DataIndex < segmentColors.length
                ) {
                  return segmentColors[ctx.p0DataIndex];
                }
                return "rgba(157, 6, 208, 1)"; // Fallback color
              },
            },
          },
        ],
      };

      // Add target line if available
      const targetValue = targets.find(
        (t) => t.operation === graphType
      )?.target;
      if (targetValue !== undefined) {
        chartConfig.datasets.push({
          label: `Target ${targetValue}${
            graphType === "Volume Produced" ? "t" : "%"
          }`,
          data: Array(chartValues.length).fill(targetValue),
          borderWidth: 2,
          borderColor: "rgb(255, 215, 0)",
          backgroundColor: "rgba(255, 215, 0, 0.1)",
          pointRadius: 0,
          borderDash: [5, 5],
          fill: false,
          tension: 0,
        });
      }

      // Set the appropriate chart data
      switch (graphType) {
        case "GE":
          setChartDataGE(chartConfig);
          break;
        case "Volume Produced":
          setChartDataVolume(chartConfig);
          break;
        case "Waste":
          setChartDataWaste(chartConfig);
          break;
        case "Speed Loss":
          setChartDataSpeed(chartConfig);
          break;
      }
    } catch (err) {
      console.error(err);
      setAlertVisiblity(true);
    } finally {
      setLoading(false);
    }
  };

  // formatare date pentru graph pe sferturi de an
  const handleSelectItemForQuarterlyGraphs = async (
    quarter: string,
    graphType: string
  ) => {
    await fetchWeeklyData(quarter, graphType);
  };

  // functie adaugare raport
  const handleSaveRaport = async () => {
    const cleanRaport = {
      tip: newRaport.tip || "",
      tipSecundar: newRaport.tipSecundar || "",
      oraIn: newRaport.oraIn || "",
      oraOut: newRaport.oraOut || "",
      zona: newRaport.zona || "",
      masina: newRaport.masina || "",
      ansamblu: newRaport.ansamblu || "",
      problema: newRaport.problema || "",
    };

    // apelam backend si verificam erori
    try {
      const res = await fetch(`http://${path}:5000/add-raport`, {
        method: "POST", // evident postam
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: Form(dateNow), raport: cleanRaport }),
      });
      if (!res.ok) throw new Error("Eroare la salvarea raportului");
      alert("Raport salvat cu succes!");
      setSelectedDataset(null);
    } catch (err) {
      console.error(err);
      alert("Nu s-a putut salva raportul.");
    }
  };

  // logica adaugare comentarii
  const handleComments = async (index: number) => {
    if (
      selectedDataset === "Minor Stoppages" ||
      selectedDataset === "Operational Losses" ||
      selectedDataset === "Breakdowns"
    ) {
      const comment = prompt("Adaugă un comentariu:");
      if (comment !== null) {
        setCardsData((prevCards) => {
          const newCards = [...prevCards];
          newCards[index] = {
            ...newCards[index],
            text: newCards[index].text + `\nComentariu: ${comment}`,
            comment: comment,
          };
          return newCards;
        });

        // aici facem post in json
        try {
          const res = await fetch(`http://${path}:5000/update-comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: Form(dateNow), // data curenta din nume
              cardIndex: index,
              comment: comment,
            }),
          });
          if (!res.ok) throw new Error("Eroare la actualizarea comentariului.");
        } catch (err) {
          console.error(err);
          alert("Nu s-a putut salva comentariul pe server.");
        }
      }
    }
  };

  // functie generare pdf - graph
  const handlePdf = async () => {
    const element = printRef.current;

    if (!element) return;

    const canvas = await html2canvas(element);
    const data = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: "a4",
    });

    const imgProperties = pdf.getImageProperties(data);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight =
      (imgProperties.height * pdfWidth) / imgProperties.width / 1.1;

    pdf.addImage(data, "PNG", 0, pdfHeight / 2, pdfWidth, pdfHeight);
    pdf.save(`${Form(dateNow)} - ${selectedGraph}.pdf`);
  };

  // new
  // functie generare pdf -
  const handleExportToPDF = async () => {
    if (!selectedHeader || !selectedLogDate) return;

    try {
      // Set ignoreH4 first and wait for next render cycle
      setIgnoreH4(true);

      // Wait for React to re-render
      await new Promise((resolve) => setTimeout(resolve, 50));

      const exportContainer = document.getElementById("pdf-container");

      if (!exportContainer) {
        console.error("Export container not found");
        setIgnoreH4(false);
        return;
      }

      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        windowWidth: 794,
        windowHeight: exportContainer.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Fixed: Remove the vertical offset
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${selectedHeader}-${selectedLogDate}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      // Ensure h4 is always shown again after PDF generation
      setIgnoreH4(false);
    }
  };

  // const pentru cele 6 grupuri de butoane
  const initials = ["Adaugă documente", "Verifică statistica", "Graphs"];
  const positions = ["Section Manager", "Process Engineer", "Line Lead"];
  const items = ["GE & Stats", "Loss Management", "Stops"];
  const rapoarte = ["Vezi Rapoarte", "Adaugă Raport"];
  const loss = ["Operational Losses", "Minor Stoppages", "Breakdowns"];
  const times = ["Month", "Quarter"];
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const graphs = ["GE", "Volume Produced", "Waste", "Speed Loss"];

  // ascunde scroll
  useEffect(() => {
    if (
      selectedDataset === "GE & Stats" &&
      selectedPosition === "Section Manager"
    ) {
      document.body.classList.remove("hide-scroll");
    } else {
      document.body.classList.add("hide-scroll");
    }
  }, [selectedPosition, selectedDataset]);

  // functie pentru selectie pozitie
  const handleSelectPosition = async (position: string) => {
    if (position === "Process Engineer" || position === "Line Lead") {
      setSelectedPosition(position);
      setShowDateForm(true);
      return;
    }
    setSelectedPosition(position);
    setCardsData([]);
    setAlertVisiblity(false);
    setNotIgnore(true);

    // verificare control backend
    if (!first.current) {
      firstFetch();
      first.current = true;
    }
  };

  // functie pentru selectie graph
  const handleSelectGraph = async (graph: string) => {
    setSelectedGraph(graph);
    setCardsData([]);
    setAlertVisiblity(false);
    setNotIgnore(true);

    if (selectedTime === "Quarter" && selectedQuarter) {
      // Fetch quarterly data
      handleSelectItemForQuarterlyGraphs(selectedQuarter, graph);
    } else if (selectedTime === "Month") {
      // Show month selection form for monthly data
      setShowMonthForm(true);
    }
  };

  // functie sfert an curent
  const getCurrentQuarter = () => {
    const currentMonth = new Date().getMonth() + 1;
    return `Q${Math.floor((currentMonth - 1) / 3) + 1}`;
  };

  // default quarter, nu poate fi mutat
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(
    getCurrentQuarter()
  );

  // functie selecte unitate timp
  const handleSelectTimes = async (time: string) => {
    setSelectedTime(time);
    setCardsData([]);
    setAlertVisiblity(false);
    setNotIgnore(true);
  };

  // functie selectie initiala
  const handleSelectInitials = async (initial: string) => {
    if (initial === "Verifică statistica") {
      setSelectedInitial(initial);
      return;
    }
    setSelectedInitial(initial);
    setCardsData([]);
    setAlertVisiblity(false);
    setNotIgnore(true);
  };

  // functie selectie sfert an
  const handleQuarterSelect = async (quarter: string) => {
    setSelectedQuarter(quarter);
    setCardsData([]);
    setAlertVisiblity(false);
    setNotIgnore(true);

    // After selecting quarter, show the graph selection
    setSelectedGraph(null);
  };

  // functie eliminare rapoarte
  const handleEliminate = async (index: number) => {
    // confirmare
    const confirmDelete = window.confirm("Sigur vrei să elimini acest raport?");
    if (!confirmDelete) return;

    // eliminare locala din cardsData
    setCardsData((prevCards) => prevCards.filter((_, i) => i !== index));

    // eliminare din bd
    try {
      const res = await fetch(`http://${path}:5000/delete-raport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: Form(dateNow), // current date key
          raportIndex: index, // index of the report to remove
        }),
      });

      if (!res.ok) throw new Error("Nu s-a putut elimina raportul pe server.");
    } catch (err) {
      console.error(err);
      alert("Eroare la eliminarea raportului de pe server.");
    }
  };

  // functie selectie tuple date
  const handleSelectItem = async (item: string) => {
    setAlertVisiblity(false);
    setNotIgnore(true);
    setCardsData([]);
    setLoading(true);
    setSelectedDataset(item);

    try {
      const response = await fetch(`http://${path}:5000/data/${Form(dateNow)}`);
      if (!response.ok) throw new Error("Eroare la descărcarea fișierului");

      const data = await response.json();
      const dateData = data.data;

      if (item === "GE & Stats") {
        const oreReferintaEntry = dateData.inceput.find(
          (entry: any) => entry.operatie === "Hours used"
        );
        const oreReferintaVal = Number(oreReferintaEntry?.valoare || 1);

        const toneReferintaEntry = dateData.inceput.find(
          (entry: any) => entry.operatie === "Volume Produced"
        );
        const toneReferintaVal = Number(toneReferintaEntry?.valoare || 0);

        const allowedMetrics =
          selectedPosition === "Section Manager"
            ? null
            : geStatsByRole[selectedPosition || ""];

        const cards = dateData.inceput
          .filter((entry: any) => {
            if (allowedMetrics && !allowedMetrics.includes(entry.operatie)) {
              return false;
            }

            const value = entry.valoare;
            return value !== null && value !== undefined && Number(value) !== 0;
          })
          .map((entry: any) => {
            const value = entry.valoare;
            let displayValue = "";

            if (typeof value === null || value === undefined) {
              return null;
            } else if (typeof value === "string" && value.includes("%")) {
              displayValue = value;
            } else if (
              [
                "Hours used",
                "Production hours",
                "Defect-free full speed operating time",
              ].includes(entry.operatie)
            ) {
              displayValue = `${Number(value).toFixed(2)} ore`;
            } else if (
              [
                "Consumables replacement",
                "Labor Management Losses",
                "Material Shortages",
                "Quality Loss",
                "Speed Loss",
              ].includes(entry.operatie)
            ) {
              let temp = (Number(value) * 100).toFixed(2);
              displayValue = `${temp} %`;
            } else if (
              [
                "Planned Maintenance",
                "Planned Autonomous Maintenance",
                "Sanitation",
                "Changeovers",
                "Planned Stops",
                "Start and Finish Production",
                "Minor Stoppages",
                "Breakdowns",
                "Operational Losses",
                "Line Delays",
              ].includes(entry.operatie)
            ) {
              let temp = Math.round(Number(value) * 60) * oreReferintaVal;
              displayValue = `${temp} minute`;
            } else if (["Volume Produced"].includes(entry.operatie)) {
              displayValue = `${toneReferintaVal.toFixed(2)} tone`;
            } else {
              displayValue = `${(value * 100).toFixed(2)} %`;
            }

            return {
              header: entry.operatie,
              text: displayValue,
            };
          })
          .filter((card: any) => card !== "0 %");

        setCardsData(cards);
      } else if (
        item === "Minor Stoppages" ||
        item === "Operational Losses" ||
        item === "Breakdowns"
      ) {
        var key = item.toLowerCase();
        if (key === "minor stoppages") {
          key = "minor_stoppages";
        } else if (key === "operational losses") {
          key = "operational_losses";
        }
        const section = dateData[key] || [];
        const cards = section.map((entry: any) => ({
          header: entry.nume_echipament,
          text: `Schimb: ${entry.schimb}\nProdus: ${entry.produs}\nMinute: ${
            entry.minute
          }${entry.comentariu ? `\nComentariu: ${entry.comentariu}` : ""}`,
        }));
        setCardsData(cards);
      } else if (item === "Vezi Rapoarte") {
        const section = dateData.rapoarte || [];
        const cards = section.map((entry: any) => ({
          header: entry.nume_echipament || entry.operatie,
          text: `Ora Inceput: ${entry.oraIn}\n
          Ora Sfarsit: ${entry.oraOut}\n
          Zona: ${entry.zona}\n
          Tip: ${entry.tip}\n
          Motiv: ${entry.tipSecundar}\n
          Ansamblu: ${entry.ansamblu}\n
          Masina: ${entry.masina}${
            entry.problema
              ? `\n
            Problema: ${entry.problema}`
              : ""
          }`,
        }));
        setCardsData(cards);
      } else if (item === "Adaugă Raport") {
        setSelectedDataset("addRaport");
      } else if (item === "Production Plan") {
        const productionPlan = dateData.production_plan || [];
        const cards = productionPlan.map((entry: any) => ({
          header: entry.tip_produs || "Production Entry",
          text: `Start Date: ${entry.start_date}\n
          End Date: ${entry.end_date}\n
          Product Type: ${entry.tip_produs}\n
          Gramaj: ${entry.gramaj}\n
          Pcs/Bax: ${entry.pcs_bax}\n
          Comanda Initiala: ${entry.comanda_initiala}\n
          Shifturi: ${entry.shifturi}\n
          Ore Productie: ${entry.ore_productie}`,
        }));
        setCardsData(cards);
      }
    } catch (err) {
      console.error(err);
      setAlertVisiblity(true);
    } finally {
      setLoading(false);
    }
  };

  // functie modificare luna
  const handleMonthSubmit = (e: React.FormEvent, graphType: string) => {
    e.preventDefault();
    setSelectedMonth(selectedMonthInput);
    setShowMonthForm(false);
    handleSelectItemForGraphs(selectedMonthInput, graphType);
  };

  // functie modificare element analizat per graph
  const handleSelectItemForGraphs = async (
    month: string,
    graphType: string
  ) => {
    setAlertVisiblity(false);
    setNotIgnore(true);
    setLoading(true);

    try {
      const response = await fetch(`http://${path}:5000/data/month/${month}`);
      if (!response.ok) throw new Error("Eroare la descărcarea datelor lunare");

      const data = await response.json();
      const monthlyData: MonthlyDataEntry[] = data.data || [];

      // Extract year and month
      const [year, monthNum] = month.split("-").map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      // Create a map of day to value for the specific operation type
      const dataMap = new Map();

      monthlyData.forEach((entry: MonthlyDataEntry) => {
        const dateStr = entry.date.toString();
        if (dateStr.length === 8) {
          const day = parseInt(dateStr.substring(6, 8), 10);

          // ONLY process the operation type we're interested in
          if (graphType === "GE" && entry.operatie === "GE") {
            const value = entry.valoare.toString().replace("%", "");
            dataMap.set(day, (parseFloat(value) * 100).toFixed(2) || 0);
          } else if (
            graphType === "Volume Produced" &&
            entry.operatie === "Volume Produced"
          ) {
            const value = entry.valoare.toString();
            dataMap.set(day, parseFloat(value).toFixed(2) || 0);
          } else if (graphType === "Waste" && entry.operatie === "Waste") {
            const value = entry.valoare.toString().replace("%", "");
            dataMap.set(day, (parseFloat(value) * 100).toFixed(2) || 0);
          } else if (
            graphType === "Speed Loss" &&
            entry.operatie === "Speed Loss"
          ) {
            const value = entry.valoare.toString().replace("%", "");
            dataMap.set(day, (parseFloat(value) * 100).toFixed(2) || 0);
          }
        }
      });

      // Prepare data for all days of the month
      const chartValues = allDays.map((day) => dataMap.get(day) || 0);

      // Get target value for this graph type
      const targetValue = targets.find(
        (t) => t.operation === graphType
      )?.target;

      // For Waste, we want the opposite logic (lower is better)
      const isWaste = graphType === "Waste" || graphType === "Speed Loss";

      // Create point colors based on target comparison
      const pointBackgroundColors = chartValues.map((value) => {
        if (targetValue === undefined) {
          return "rgba(21, 233, 56, 1)"; // Default to green if no target
        }

        const isGood = isWaste ? value <= targetValue : value >= targetValue;
        return isGood ? "rgba(21, 233, 56, 1)" : "rgba(255, 99, 132, 1)";
      });

      const pointBorderColors = pointBackgroundColors;

      // Create segment colors for the lines between points - always use left point color
      const segmentColors = [];
      const segmentBackgroundColors = [];

      for (let i = 0; i < chartValues.length - 1; i++) {
        // Always use the color of the right point (current point)
        const segmentColor = pointBackgroundColors[i + 1];
        segmentColors.push(segmentColor);
        segmentBackgroundColors.push(segmentColor.replace("1)", "0.2)")); // Convert to transparent version
      }

      // Create the main dataset with segment coloring
      const mainDataset = {
        label:
          graphType === "GE"
            ? "GE (%)"
            : graphType === "Volume Produced"
            ? "Volume Produced (t)"
            : graphType === "Waste"
            ? "Waste (%)"
            : "Speed Loss",
        data: chartValues,
        borderColor: (ctx: any) => {
          // Use the color of the RIGHT point for the segment
          if (
            ctx.p0DataIndex !== undefined &&
            ctx.p0DataIndex < segmentColors.length
          ) {
            return segmentColors[ctx.p0DataIndex];
          }
          return "rgba(174, 128, 189, 0.2)"; // Fallback color
        },
        backgroundColor: (ctx: any) => {
          // Use the color of the RIGHT point for the background
          if (
            ctx.p0DataIndex !== undefined &&
            ctx.p0DataIndex >= 0 &&
            ctx.p0DataIndex < segmentBackgroundColors.length
          ) {
            return segmentBackgroundColors[ctx.p0DataIndex];
          }
          return "rgba(174, 128, 189, 0.2)"; // Fallback color (should be transparent)
        },
        pointBackgroundColor: pointBackgroundColors,
        pointBorderColor: pointBorderColors,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        segment: {
          borderColor: (ctx: any) => {
            // Use the color of the RIGHT point for the segment
            if (
              ctx.p0DataIndex !== undefined &&
              ctx.p0DataIndex < segmentColors.length
            ) {
              return segmentColors[ctx.p0DataIndex];
            }
            return "rgba(75, 192, 192, 1)"; // Fallback color
          },
        },
      };
      // Common chart configuration
      const chartConfig = {
        labels: allDays.map((day) => day.toString()),
        datasets: [mainDataset],
      };

      // Add target dataset if target exists
      if (targetValue !== undefined) {
        chartConfig.datasets.push({
          label: `Target (${targetValue})`,
          data: Array(allDays.length).fill(targetValue),
          borderWidth: 2,
          borderColor: "rgb(255, 215, 0)",
          backgroundColor: "rgba(255, 215, 0, 0.1)",
          pointRadius: 0,
          borderDash: [5, 5],
          fill: false,
          tension: 0,
        });
      }

      // Set the chart data based on graph type
      if (graphType === "GE") {
        setChartDataGE(chartConfig);
      } else if (graphType === "Volume Produced") {
        setChartDataVolume(chartConfig);
      } else if (graphType === "Waste") {
        setChartDataWaste(chartConfig);
      } else if (graphType === "Speed Loss") {
        setChartDataSpeed(chartConfig);
      }
    } catch (err) {
      console.error(err);
      setAlertVisiblity(true);
    } finally {
      setLoading(false);
    }
  };

  // redare rapoarte
  const renderReportsTable = () => {
    return (
      <table className="table tb table-striped table-bordered">
        <thead>
          <tr>
            <th>Ora Început</th>
            <th>Ora Sfârșit</th>
            <th>Zona</th>
            <th>Tip</th>
            <th>Motiv</th>
            <th>Mașina</th>
            <th>Ansamblu</th>
            <th>Problema</th>
          </tr>
        </thead>
        <tbody>
          {cardsData.map((card, index) => {
            const lines = card.text.split("\n");
            const getLineValue = (label: string) => {
              const line = lines.find((l) => l.startsWith(label));
              return line ? line.split(": ")[1] : "";
            };
            return (
              <tr
                key={index}
                onClick={() => handleEliminate(index)}
                style={{ cursor: "no-drop" }}
              >
                <td>{getLineValue("Ora Inceput")}</td>
                <td>{getLineValue("Ora Sfarsit")}</td>
                <td>{getLineValue("Zona")}</td>
                <td>{getLineValue("Tip")}</td>
                <td>{getLineValue("Motiv")}</td>
                <td>{getLineValue("Masina")}</td>
                <td>{getLineValue("Ansamblu")}</td>
                <td>{getLineValue("Problema")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // redare tabel productie
  const renderProductionTable = () => {
    const now = new Date(selectedDate);
    const currentDate = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Create a mapping of production entries with their parsed data
    const productionEntries = productionPlanData
      .map((card) => {
        const lines = card.text.split("\n");
        const getLineValue = (label: string) => {
          const line = lines.find((l) => l.startsWith(label));
          return line ? line.split(": ")[1] : "";
        };

        return {
          card,
          start_date: getLineValue("Start Date"),
          end_date: getLineValue("End Date"),
          tip_produs: getLineValue("Product Type"),
          gramaj: getLineValue("Gramaj"),
          pcs_bax: getLineValue("Pcs/Bax"),
          comanda_initiala: getLineValue("Comanda Initiala"),
          shifturi: getLineValue("Shifturi"),
          ore_productie: getLineValue("Ore Productie"),
        };
      })
      .filter((entry) => entry.start_date && entry.start_date !== "null");

    // Sort production data by start time
    const sortedProductionData = [...productionEntries].sort((a, b) => {
      const startDateA = new Date(a.start_date);
      const startDateB = new Date(b.start_date);
      return startDateA - startDateB;
    });

    // Process all productions and fill missing values from previous rows
    const processedProductions = [];
    let lastValidProduction = null;

    for (const entry of sortedProductionData) {
      try {
        const startTime = new Date(entry.start_date);
        const endTime = new Date(entry.end_date);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          continue;
        }

        const startDate = startTime.toDateString();
        const endDate = endTime.toDateString();
        const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

        // Create a new production entry with filled values
        const processedEntry = {
          ...entry,
          // Use current value if valid, otherwise use previous valid value
          tip_produs:
            entry.tip_produs && entry.tip_produs !== "null"
              ? entry.tip_produs
              : lastValidProduction?.tip_produs || "N/A",
          gramaj:
            entry.gramaj && entry.gramaj !== "null"
              ? entry.gramaj
              : lastValidProduction?.gramaj || "N/A",
          pcs_bax:
            entry.pcs_bax && entry.pcs_bax !== "null"
              ? entry.pcs_bax
              : lastValidProduction?.pcs_bax || "N/A",
          comanda_initiala:
            entry.comanda_initiala && entry.comanda_initiala !== "null"
              ? entry.comanda_initiala
              : lastValidProduction?.comanda_initiala || "N/A",
          startDateObj: startTime,
          endDateObj: endTime,
          startMinutes,
          endMinutes,
          startDate,
          endDate,
          isYesterday: startDate === yesterdayString,
        };

        // Update last valid production if this one has valid values
        if (entry.tip_produs && entry.tip_produs !== "null") {
          lastValidProduction = processedEntry;
        }

        processedProductions.push(processedEntry);
      } catch (error) {
        console.error("Error processing production entry:", error, entry);
      }
    }

    // Find current and upcoming productions (including yesterday's ongoing productions)
    let currentProduction = null;
    const upcomingProductions = [];

    for (const entry of processedProductions) {
      const isToday =
        entry.startDate === currentDate || entry.endDate === currentDate;
      const isYesterday = entry.isYesterday;
      const isFuture = entry.startDateObj > now;

      // Check if this production is currently active (including those that started yesterday)
      if (isToday || isYesterday) {
        const isCurrentlyActive =
          // Production started yesterday and is still active today
          (isYesterday &&
            entry.endDate === currentDate &&
            currentTime <= entry.endMinutes) ||
          // Production started today and is active now
          (isToday &&
            currentTime >= entry.startMinutes &&
            currentTime <= entry.endMinutes) ||
          // Production spans multiple days including today
          (isYesterday && entry.endDateObj > now);

        if (isCurrentlyActive) {
          currentProduction = entry;
        }
      }

      // Check if it's upcoming (future productions)
      if (isFuture) {
        upcomingProductions.push(entry);
      }
    }

    // Also include yesterday's productions that might still be relevant
    const yesterdaysProductions = processedProductions
      .filter((entry) => entry.isYesterday)
      .sort((a, b) => b.endMinutes - a.endMinutes); // Sort by end time, latest first

    // Prepare rows to display
    const rowsToDisplay = [];

    // Add current production if found
    if (currentProduction) {
      rowsToDisplay.push({
        ...currentProduction,
        isCurrent: true,
        displayType: "current",
      });
    }

    // Add yesterday's latest production if no current production found
    if (rowsToDisplay.length === 0 && yesterdaysProductions.length > 0) {
      const latestYesterday = yesterdaysProductions[0];
      rowsToDisplay.push({
        ...latestYesterday,
        isCurrent: false,
        displayType: "yesterday",
      });
    }

    // Add upcoming productions
    const neededUpcoming = 3 - rowsToDisplay.length;
    for (
      let i = 0;
      i < Math.min(neededUpcoming, upcomingProductions.length);
      i++
    ) {
      rowsToDisplay.push({
        ...upcomingProductions[i],
        isCurrent: false,
        displayType: "upcoming",
      });
    }

    // If we still need more rows, add today's productions
    if (rowsToDisplay.length < 3) {
      const todaysProductions = processedProductions
        .filter(
          (entry) =>
            entry.startDate === currentDate &&
            !rowsToDisplay.some((row) => row.start_date === entry.start_date)
        )
        .slice(0, 3 - rowsToDisplay.length);

      rowsToDisplay.push(
        ...todaysProductions.map((entry) => ({
          ...entry,
          isCurrent: false,
          displayType: "today",
        }))
      );
    }

    // "Ieri" for yesterday
    const formatTimeDisplay = (
      dateString: string,
      dateObj: Date,
      isEndTime: boolean = false,
      displayType: string
    ) => {
      const displayDate = dateObj.toDateString();

      if (displayDate !== currentDate && displayDate === yesterdayString) {
        return "Ieri";
      }

      if (displayDate !== currentDate && displayDate !== yesterdayString) {
        return "Mâine";
      }

      return extractHourMinute(dateString);
    };

    return (
      <table className="table tb-prod table-bordered">
        <thead>
          <td colSpan={8} className="table-title">
            Plan Productie
          </td>

          <tr>
            <th>Start Productie</th>
            <th>Sfârșit Productie</th>
            <th>Nume Produs</th>
            <th>Gramaj</th>
            <th>Bucati Bax</th>
            <th>Cantitate Comandata</th>
            <th>Shift</th>
            <th>Ore Productie</th>
          </tr>
        </thead>
        <tbody>
          {rowsToDisplay.map((entry, index) => {
            return (
              <tr
                key={index}
                className={entry.isCurrent ? "current-production" : ""}
                style={{ cursor: "no-drop" }}
              >
                <td>
                  {formatTimeDisplay(
                    entry.start_date,
                    entry.startDateObj,
                    false,
                    entry.displayType
                  )}
                </td>
                <td>
                  {formatTimeDisplay(
                    entry.end_date,
                    entry.endDateObj,
                    true,
                    entry.displayType
                  )}
                </td>
                <td>{entry.tip_produs}</td>
                <td>{entry.gramaj}</td>
                <td>{entry.pcs_bax}</td>
                <td>{Number(entry.comanda_initiala || 0)}</td>
                <td>{Number(entry.shifturi || 0).toFixed(2)}</td>
                <td>{Number(entry.ore_productie || 0).toFixed(2)}</td>
              </tr>
            );
          })}

          {rowsToDisplay.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center">
                <h2 className="eroare_productie">
                  Nu există date de producție pentru afișare.
                </h2>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  // redare tabel bos
  const renderBOSTable = () => {
    return (
      <div>
        <table className="table tb-bos table-bordered">
          <thead>
            <td colSpan={2}>Safety</td>
            <tr>
              <th>Actiune Sigura</th>
              <th>Actiune Nesigura</th>
            </tr>
          </thead>
          <tbody>
            {bosData.map((card, index) => {
              const lines = card.text.split("\n");
              const getLineValue = (label: string) => {
                const line = lines.find((l) => l.startsWith(label));
                return line ? line.split(": ")[1] : "";
              };
              return (
                <tr key={index} style={{ cursor: "no-drop" }}>
                  <td>{getLineValue("Actiune Sigura")}</td>
                  <td>{getLineValue("Actiune Nesigura")}</td>
                </tr>
              );
            })}
          </tbody>
          <thead>
            <tr>
              <th>Near Miss</th>
              <th>Unsafe Cond.</th>
            </tr>
          </thead>
          <tbody>
            {nmData.map((card, index) => {
              const lines = card.text.split("\n");
              const getLineValue = (label: string) => {
                const line = lines.find((l) => l.startsWith(label));
                return line ? line.split(": ")[1] : "";
              };
              return (
                <tr key={index} style={{ cursor: "no-drop" }}>
                  <td>{getLineValue("Near Miss")}</td>
                  <td>{getLineValue("Conditii Nesigure")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // logica de intoarcere la pozitii
  const handleBackToPositions = () => {
    setSelectedPosition(null);
    setCardsData([]);
    setAlertVisiblity(false);
    setNotIgnore(false);
    setSelectedDataset(null);
    setSelectedGraph(null);
    setSelectedTime(null);
    setSelectedQuarter(null);
    setChartDataGE(null);
    setChartDataVolume(null);
    setChartDataWaste(null);
    setSelectedMonth(null);
    setShowBOSTable(false);
  };

  // logica de intoarcere la sectii
  const handleBackToDatasets = () => {
    setSelectedDataset(null);
    setCardsData([]);
  };

  // functie de selectare data (inceput)
  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const temp = new Date(selectedDate);
    if (temp instanceof Date && !isNaN(temp.getTime())) {
      dateNow = temp;
      setShowDateForm(false);
      if (selectedPosition === "Line Lead") {
        fetchProductionPlanData(selectedDate);
      }
    }
  };

  // functie formatare selectare luna
  const MonthSelectionForm = ({ graphType }: { graphType: string }) => (
    <div className="row-date g-2t">
      <form onSubmit={(e) => handleMonthSubmit(e, graphType)}>
        <div className="mb-3">
          <input
            type="month"
            className="form-control"
            id="monthInput"
            value={selectedMonthInput}
            onChange={(e) => setSelectedMonthInput(e.target.value)}
            required
          />
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn-inapoi btn-primary">
            Confirmă
          </button>
          <button
            type="button"
            className="btn-inapoi btn-secondary"
            onClick={() => setSelectedGraph(null)}
          >
            Înapoi
          </button>
        </div>
      </form>
    </div>
  );

  // jsx, deci DOM-ul site-ului
  return (
    <div className="container mt-4">
      <Breadcrumbs />
      <HeaderDetailsPopup />
      {alertVisible && (
        <Alert onClose={() => setAlertVisiblity(false)}>
          Eroare la încărcarea datelor. Verifică fișierul JSON.
        </Alert>
      )}
      {!selectedInitial ? (
        <>
          <ButtonGroup
            items={initials}
            heading="DMS-2 Digitalization Tool"
            onSelectItem={handleSelectInitials}
          />
        </>
      ) : selectedInitial === "Adaugă documente" ? (
        <div className="space-y-2">
          <>
            <Dropzone heading="BOS" uploadType="Formular BOS" />
            <Dropzone
              heading="Daily Management Session"
              uploadType="excelMare"
            />
            <Dropzone heading="Production Plan" uploadType="productionPlan" />
            <Dropzone
              heading="Unsafe Conditions"
              uploadType="Formular raportare eveniment la limita producerii unui accident sau situație periculoasă"
            />
          </>
        </div>
      ) : selectedInitial === "Graphs" && !selectedTime ? (
        <>
          <ButtonGroup
            items={times}
            heading="Selecteaza unitatea de timp"
            onSelectItem={handleSelectTimes}
          />
        </>
      ) : selectedTime === "Quarter" && !selectedQuarter ? (
        <>
          <ButtonGroup
            items={quarters}
            heading="Selecteaza trimestrul"
            onSelectItem={handleQuarterSelect}
          />
        </>
      ) : selectedTime === "Quarter" && selectedQuarter && !selectedGraph ? (
        <>
          <ButtonGroup
            items={graphs}
            heading={`Selecteaza graficul pentru ${selectedQuarter}`}
            onSelectItem={handleSelectGraph}
          />
        </>
      ) : selectedTime === "Quarter" && selectedQuarter && selectedGraph ? (
        <div className="mt-4">
          {loading ? (
            <p>Se încarcă...</p>
          ) : (
            <>
              <h1>
                Date pentru {selectedGraph} - {selectedQuarter}
              </h1>
              {selectedGraph === "GE" && chartDataGE ? (
                <>
                  <div
                    ref={printRef}
                    className="dataCard graph"
                    style={{ height: "400px" }}
                    onClick={handlePdf}
                  >
                    <Line
                      data={chartDataGE}
                      options={propGrafica(
                        "GE %",
                        selectedQuarter,
                        targets.find((t) => t.operation === "GE")?.target,
                        true
                      )}
                    />
                  </div>
                  <button
                    className="btn-inapoi btn-primary"
                    style={{ marginTop: "1rem" }}
                    onClick={() => setSelectedQuarter(null)}
                  >
                    Înapoi
                  </button>
                </>
              ) : selectedGraph === "Volume Produced" && chartDataVolume ? (
                <>
                  <div
                    ref={printRef}
                    className="dataCard graph"
                    style={{ height: "400px" }}
                    onClick={handlePdf}
                  >
                    <Line
                      data={chartDataVolume}
                      options={propGrafica(
                        "Volume (t)",
                        selectedQuarter,
                        targets.find((t) => t.operation === "Volume Produced")
                          ?.target,
                        true
                      )}
                    />
                  </div>
                  <button
                    className="btn-inapoi btn-primary"
                    style={{ marginTop: "1rem" }}
                    onClick={() => setSelectedQuarter(null)}
                  >
                    Înapoi
                  </button>
                </>
              ) : selectedGraph === "Waste" && chartDataWaste ? (
                <>
                  <div
                    ref={printRef}
                    className="dataCard graph"
                    style={{ height: "400px" }}
                    onClick={handlePdf}
                  >
                    <Line
                      data={chartDataWaste}
                      options={propGrafica(
                        "Waste %",
                        selectedQuarter,
                        targets.find((t) => t.operation === "Waste")?.target,
                        true
                      )}
                    />
                  </div>
                  <button
                    className="btn-inapoi btn-primary"
                    style={{ marginTop: "1rem" }}
                    onClick={() => setSelectedQuarter(null)}
                  >
                    Înapoi
                  </button>
                </>
              ) : selectedGraph === "Speed Loss" && chartDataSpeed ? (
                <>
                  <div
                    ref={printRef}
                    className="dataCard graph"
                    style={{ height: "400px" }}
                    onClick={handlePdf}
                  >
                    <Line
                      data={chartDataSpeed}
                      options={propGrafica(
                        "Speed Loss %",
                        selectedQuarter,
                        targets.find((t) => t.operation === "Speed Loss")
                          ?.target,
                        true
                      )}
                    />
                  </div>
                  <button
                    className="btn-inapoi btn-primary"
                    style={{ marginTop: "1rem" }}
                    onClick={() => setSelectedQuarter(null)}
                  >
                    Înapoi
                  </button>
                </>
              ) : (
                <p>
                  Nu există date pentru {selectedGraph} în {selectedQuarter}.
                </p>
              )}
            </>
          )}
        </div>
      ) : selectedTime === "Month" && !selectedGraph ? (
        <>
          <ButtonGroup
            items={graphs}
            heading="Selecteaza datele"
            onSelectItem={handleSelectGraph}
          />
        </>
      ) : selectedGraph === "GE" ? (
        <div className="mt-4">
          {showMonthForm ? (
            <MonthSelectionForm graphType="GE" />
          ) : !selectedMonth ? (
            <p>
              <button
                className="btn-inapoi-luna btn-primary"
                onClick={() => setShowMonthForm(true)}
              >
                Selectează Luna
              </button>
            </p>
          ) : (
            <>
              {loading ? (
                <p>Se încarcă...</p>
              ) : chartDataGE ? (
                <div
                  ref={printRef}
                  className="dataCard graph"
                  style={{ height: "400px" }}
                  onClick={handlePdf}
                >
                  <Line
                    data={chartDataGE}
                    options={propGrafica(
                      "GE %",
                      selectedMonth,
                      targets.find((t) => t.operation === "GE")?.target,
                      false
                    )}
                  />
                </div>
              ) : (
                <p>Nu există date pentru luna selectată.</p>
              )}

              <>
                <button
                  className="btn-inapoi-luna btn-primary"
                  onClick={() => setShowMonthForm(true)}
                >
                  Schimbă Luna
                </button>
              </>
              <>
                <button
                  className="btn-inapoi btn-primary"
                  onClick={() => setSelectedTime(null)}
                >
                  Înapoi
                </button>
              </>
            </>
          )}
        </div>
      ) : selectedGraph === "Volume Produced" ? (
        <div className="mt-4">
          {showMonthForm ? (
            <MonthSelectionForm graphType="Volume Produced" />
          ) : !selectedMonth ? (
            <p>
              <button
                className="btn-inapoi-luna btn-primary"
                onClick={() => setShowMonthForm(true)}
              >
                Selectează Luna
              </button>
            </p>
          ) : (
            <>
              {loading ? (
                <p>Se încarcă...</p>
              ) : chartDataVolume ? (
                <div
                  ref={printRef}
                  className="dataCard graph"
                  style={{ height: "400px" }}
                  onClick={handlePdf}
                >
                  <Line
                    data={chartDataVolume}
                    options={propGrafica(
                      "Tones",
                      selectedMonth,
                      targets.find((t) => t.operation === "Volume Produced")
                        ?.target,
                      false
                    )}
                  />
                </div>
              ) : (
                <p>Nu există date pentru luna selectată.</p>
              )}

              <button
                className="btn-inapoi-luna btn-primary"
                onClick={() => setShowMonthForm(true)}
              >
                Schimbă Luna
              </button>
              <button
                className="btn-inapoi btn-primary"
                onClick={() => setSelectedTime(null)}
              >
                Înapoi
              </button>
            </>
          )}
        </div>
      ) : selectedGraph === "Waste" ? (
        <div className="mt-4">
          {showMonthForm ? (
            <MonthSelectionForm graphType="Waste" />
          ) : !selectedMonth ? (
            <p>
              <button
                className="btn-inapoi-luna btn-primary"
                onClick={() => setShowMonthForm(true)}
              >
                Selectează Luna
              </button>
            </p>
          ) : (
            <>
              {loading ? (
                <p>Se încarcă...</p>
              ) : chartDataWaste ? (
                <div
                  ref={printRef}
                  className="dataCard graph"
                  style={{ height: "400px" }}
                  onClick={handlePdf}
                >
                  <Line
                    data={chartDataWaste}
                    options={propGrafica(
                      "Waste %",
                      selectedMonth,
                      targets.find((t) => t.operation === "Waste")?.target,
                      false
                    )}
                  />
                </div>
              ) : (
                <p>Nu există date pentru luna selectată.</p>
              )}
              <p>
                <button
                  className="btn-inapoi-luna btn-primary"
                  onClick={() => setShowMonthForm(true)}
                >
                  Schimbă Luna
                </button>
              </p>
              <button
                className="btn-inapoi btn-primary"
                onClick={() => setSelectedTime(null)}
              >
                Înapoi
              </button>
            </>
          )}
        </div>
      ) : selectedGraph === "Speed Loss" ? (
        <div className="mt-4">
          {showMonthForm ? (
            <MonthSelectionForm graphType="Speed Loss" />
          ) : !selectedMonth ? (
            <p>
              <button
                className="btn-inapoi-luna btn-primary"
                onClick={() => setShowMonthForm(true)}
              >
                Selectează Luna
              </button>
            </p>
          ) : (
            <>
              <p>
                <button
                  className="btn-inapoi-luna btn-primary"
                  onClick={() => setShowMonthForm(true)}
                >
                  Schimbă Luna
                </button>
              </p>

              {loading ? (
                <p>Se încarcă...</p>
              ) : chartDataSpeed ? (
                <div
                  ref={printRef}
                  className="dataCard graph"
                  style={{ height: "400px" }}
                  onClick={handlePdf}
                >
                  <Line
                    data={chartDataSpeed}
                    options={propGrafica(
                      "%",
                      selectedMonth,
                      targets.find((t) => t.operation === "Speed Loss")?.target,
                      false
                    )}
                  />
                </div>
              ) : (
                <p>Nu există date pentru luna selectată.</p>
              )}
            </>
          )}
        </div>
      ) : selectedInitial === "Verifică statistica" && !selectedPosition ? (
        <>
          <ButtonGroup
            items={positions}
            heading="Selectează poziția"
            onSelectItem={handleSelectPosition}
          />
        </>
      ) : selectedPosition === "Line Lead" ? (
        <>
          {showDateForm && (
            <>
              <h1 className="heading">Selectează data</h1>
              <>
                <form onSubmit={handleDateSubmit}>
                  <div className="row-date mb-3">
                    <input
                      type="date"
                      className="form-control"
                      id="dateInput"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="btn-date">
                    <button
                      type="submit"
                      className="btn-inapoi-imp btn-primary"
                    >
                      Confirmă
                    </button>
                    <button
                      type="button"
                      className="btn-inapoi-imp btn-secondary"
                      onClick={() => {
                        setShowDateForm(false);
                        setSelectedInitial(null);
                      }}
                    >
                      Anulează
                    </button>
                  </div>
                </form>
              </>
            </>
          )}
          {!showDateForm && (
            <>
              <div className="sus-line-lead">
                <div>
                  {loading ? (
                    <p>Se încarcă planul de producție...</p>
                  ) : productionPlanData.length > 0 ? (
                    renderProductionTable()
                  ) : (
                    <h2 className="eroare_productie">
                      Nu există date pentru planul de producție.
                    </h2>
                  )}
                </div>
                {!showBOSTable && (
                  <button
                    className="btn-bos"
                    onClick={() => setShowBOSTable(true)}
                  >
                    {" "}
                    Safety
                  </button>
                )}
                <>{showBOSTable && renderBOSTable()}</>
              </div>
              {showMonthForm ? (
                <MonthSelectionForm graphType="GE" />
              ) : loading ? (
                <p>Se încarcă...</p>
              ) : chartDataGE ? (
                <>
                  <div
                    ref={printRef}
                    className="dataCard graph"
                    style={{ height: "400px" }}
                    onClick={handlePdf}
                  >
                    <Line
                      data={chartDataGE}
                      options={propGrafica(
                        "GE %",
                        selectedMonth || "",
                        targets.find((t) => t.operation === "GE")?.target,
                        false
                      )}
                    />
                  </div>
                  <div>
                    <Stiri jsonUrl={`http://${path}:5000/news`} path={path} />
                  </div>
                </>
              ) : (
                <>
                  <button
                    className="btn-inapoi btn-primary"
                    onClick={() => setShowMonthForm(true)}
                  >
                    Afișează Grafic GE
                  </button>
                  <p>Apasă butonul pentru a afișa graficul GE.</p>
                </>
              )}
            </>
          )}
        </>
      ) : selectedPosition === "Section Manager" ? (
        <div className="mt-4">
          <h2>Log Viewer - Section Manager Production</h2>

          {showLogDateForm ? (
            <div className="row-date g-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedLogDate) {
                    fetchSectionManagerProductionData(selectedLogDate);
                    setShowLogDateForm(false);
                  }
                }}
              >
                <div className="row-date mb-3">
                  <input
                    type="date"
                    className="form-control"
                    id="logDateInput"
                    value={selectedLogDate || ""}
                    onChange={(e) => setSelectedLogDate(e.target.value)}
                    required
                  />
                </div>
                <div className="btn-date">
                  <button type="submit" className="btn-inapoi-imp btn-primary">
                    Confirmă
                  </button>
                  <button
                    type="button"
                    className="btn-inapoi-imp btn-secondary"
                    onClick={() => {
                      setShowLogDateForm(false);
                      setSelectedLogViewer(null);
                    }}
                  >
                    Anulează
                  </button>
                </div>
              </form>
            </div>
          ) : logViewerData.length > 0 ? (
            <>
              {renderProductionLogTable()}
              <div className="row-date mb-3">
                <button
                  className="btn-inapoi btn-primary"
                  onClick={() => setShowLogDateForm(true)}
                >
                  Schimbă Data
                </button>
                <button
                  className="btn-inapoi btn-secondary"
                  onClick={() => {
                    setSelectedLogViewer(null);
                    setLogViewerData([]);
                    setSelectedPosition(null);
                  }}
                >
                  Înapoi
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: "2rem" }}>
                Selectează o dată pentru a vizualiza datele de producție.
              </div>
              <button
                className="btn-inapoi btn-primary"
                onClick={() => setShowLogDateForm(true)}
              >
                Selectează Data
              </button>
            </>
          )}
        </div>
      ) : selectedDataset === "addRaport" ? (
        <div className="mt-4">
          <h3>Formular Raport Nou</h3>
          <div className="row g-2">
            <div className="col-md">
              <div className="form-floating">
                <input
                  type="time"
                  className="form-control"
                  id="oraIn"
                  value={newRaport.oraIn}
                  onChange={(e) =>
                    setNewRaport({ ...newRaport, oraIn: e.target.value })
                  }
                />
                <label htmlFor="oraIn">Ora Începere</label>
              </div>
            </div>

            <div className="col-md">
              <div className="form-floating">
                <input
                  type="time"
                  className="form-control"
                  id="oraOut"
                  value={newRaport.oraOut}
                  onChange={(e) =>
                    setNewRaport({ ...newRaport, oraOut: e.target.value })
                  }
                />
                <label htmlFor="oraOut">Ora Sfârșit</label>
              </div>
            </div>

            <div className="col-md">
              <div className="form-floating">
                <select
                  className="form-select"
                  id="zonaSelect"
                  value={newRaport.zona}
                  onChange={(e) =>
                    setNewRaport({ ...newRaport, zona: e.target.value })
                  }
                >
                  <option value="">Selectează</option>
                  <option value="1">L1</option>
                  <option value="2">L2</option>
                  <option value="3">L3</option>
                </select>
                <label htmlFor="zonaSelect">Zona</label>
              </div>
            </div>

            <div className="col-md">
              <div className="form-floating">
                <select
                  className="form-select"
                  id="tipSelect"
                  value={newRaport.tip}
                  onChange={(e) =>
                    setNewRaport({ ...newRaport, tip: e.target.value })
                  }
                >
                  <option value="">Selectează</option>
                  <option value="Unplanned">Unplanned</option>
                  <option value="Planned">Planned</option>
                </select>
                <label htmlFor="tipSelect">Tip</label>
              </div>
            </div>

            {newRaport.tip === "Planned" && (
              <div className="col-md">
                <div className="form-floating">
                  <select
                    className="form-select"
                    id="tipSelectPlanned"
                    value={newRaport.tipSecundar || ""}
                    onChange={(e) =>
                      setNewRaport({
                        ...newRaport,
                        tipSecundar: e.target.value,
                      })
                    }
                  >
                    <option value="">Selectează</option>
                    <option value="Changeover">Changeover</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Autonomous Maintenance">
                      Autonomous Maintenance
                    </option>
                    <option value="Stops">Stops</option>
                    <option value="Consumables replacement">
                      Consumables replacement
                    </option>
                    <option value="Start and Finish Production">
                      Start and Finish Production
                    </option>
                  </select>
                  <label htmlFor="tipSelectPlanned">Motiv</label>
                </div>
              </div>
            )}

            {newRaport.tip === "Unplanned" && (
              <div className="col-md">
                <div className="form-floating">
                  <select
                    className="form-select"
                    id="tipSelectUnplanned"
                    value={newRaport.tipSecundar || ""}
                    onChange={(e) =>
                      setNewRaport({
                        ...newRaport,
                        tipSecundar: e.target.value,
                      })
                    }
                  >
                    <option value="">Selectează</option>
                    <option value="Breakdowns">Breakdowns</option>
                    <option value="Stoppage">Stoppage</option>
                    <option value="Operational Losses">
                      Operational Losses
                    </option>
                    <option value="Line Delays">Line Delays</option>
                    <option value="Labor Management Losses">
                      Labor Management Losses
                    </option>
                  </select>
                  <label htmlFor="tipSelectUnplanned">Motiv</label>
                </div>
              </div>
            )}

            {(newRaport.tip === "Unplanned" ||
              (newRaport.tip === "Planned" &&
                (newRaport.tipSecundar === "Sanitation" ||
                  newRaport.tipSecundar === "Maintenance" ||
                  newRaport.tipSecundar === "Stops"))) && (
              <div className="col-md">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control"
                    id="masina"
                    value={newRaport.masina}
                    onChange={(e) =>
                      setNewRaport({ ...newRaport, masina: e.target.value })
                    }
                  />
                  <label htmlFor="masina">Mașina</label>
                </div>
              </div>
            )}

            {(newRaport.tip === "Unplanned" ||
              (newRaport.tip === "Planned" &&
                (newRaport.tipSecundar === "Sanitation" ||
                  newRaport.tipSecundar === "Maintenance" ||
                  newRaport.tipSecundar === "Stops"))) && (
              <div className="col-md">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control"
                    id="ansamblu"
                    value={newRaport.ansamblu}
                    onChange={(e) =>
                      setNewRaport({ ...newRaport, ansamblu: e.target.value })
                    }
                  />
                  <label htmlFor="ansamblu">Ansamblu</label>
                </div>
              </div>
            )}

            {(newRaport.tip === "Unplanned" ||
              (newRaport.tip === "Planned" &&
                (newRaport.tipSecundar === "Sanitation" ||
                  newRaport.tipSecundar === "Maintenance" ||
                  newRaport.tipSecundar === "Stops"))) && (
              <div className="col-md">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control"
                    id="problema"
                    value={newRaport.problema}
                    onChange={(e) =>
                      setNewRaport({ ...newRaport, problema: e.target.value })
                    }
                  />
                  <label htmlFor="problema">Problema</label>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3">
            <button
              className="btn btn-group-vertical-item"
              onClick={handleSaveRaport}
            >
              Salvează Raport
            </button>
            <button
              className="btn btn-group-vertical-item"
              onClick={() => setSelectedDataset(null)}
            >
              Înapoi
            </button>
          </div>
        </div>
      ) : !selectedDataset && selectedInitial !== "Adaugă documente" ? (
        <>
          {showDateForm && (
            <>
              <h1 className="heading">Selectează data</h1>
              <>
                <form onSubmit={handleDateSubmit}>
                  <div className="row-date mb-3">
                    <input
                      type="date"
                      className="form-control"
                      id="dateInput"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="btn-date">
                    <button
                      type="submit"
                      className="btn-inapoi-imp btn-primary"
                    >
                      Confirmă
                    </button>
                    <button
                      type="button"
                      className="btn-inapoi-imp btn-secondary"
                      onClick={() => {
                        setShowDateForm(false);
                        setSelectedInitial(null);
                      }}
                    >
                      Anulează
                    </button>
                  </div>
                </form>
              </>
            </>
          )}
          {!showDateForm && (
            <ButtonGroup
              items={items}
              heading={`Seturi de date pentru ${selectedPosition}`}
              onSelectItem={handleSelectItem}
            />
          )}
        </>
      ) : selectedDataset === "Loss Management" ? (
        <>
          <ButtonGroup
            items={loss}
            heading={`Loss Management`}
            onSelectItem={handleSelectItem}
          />
        </>
      ) : selectedDataset === "Stops" ? (
        <>
          <ButtonGroup
            items={rapoarte}
            heading={`Line Stoppage Management`}
            onSelectItem={handleSelectItem}
          />
        </>
      ) : (
        <></>
      )}

      {loading && <p>Se încarcă...</p>}

      {selectedDataset && !loading && cardsData.length > 0 && (
        <div className="mt-4">
          {selectedDataset === "Vezi Rapoarte" ? (
            renderReportsTable()
          ) : (
            <div
              className="d-flex justify-content-center align-items-center flex-wrap"
              style={{
                minHeight: "50vh",
                padding: "2rem",
                borderRadius: "1rem",
              }}
            >
              {cardsData.map((card, index) => (
                <div
                  className="card text-bg-primary mb-3"
                  style={{ maxWidth: "18rem" }}
                  key={index}
                  onClick={() => handleComments(index)}
                >
                  <div className="card-header fw-bold">
                    {card.header || newRaport.tip}
                  </div>
                  <div className="card-body">
                    <p className="card-text" style={{ whiteSpace: "pre-wrap" }}>
                      {card.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

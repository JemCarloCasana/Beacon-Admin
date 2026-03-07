import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "@/pages/Auth";
import { adminLogin, adminSignup } from "@/api/adminAuth";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/api/adminAuth", () => ({
  adminLogin: vi.fn(),
  adminSignup: vi.fn(),
}));

function renderAuth() {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );
}

function getActivePanel() {
  return document.querySelector('[role="tabpanel"][data-state="active"]');
}

describe("Auth page validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows inline login email error and blocks submit", async () => {
    renderAuth();

    const panel = getActivePanel();
    const email = within(panel).getByPlaceholderText("name@dagupan.gov");
    const password = within(panel).getByPlaceholderText("********");
    fireEvent.change(email, { target: { value: "bad-email" } });
    fireEvent.change(password, { target: { value: "SomePassword1!" } });
    fireEvent.blur(email);

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(adminLogin).not.toHaveBeenCalled();
  });

  it("shows signup password policy error", async () => {
    renderAuth();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Register" })).toHaveAttribute("data-state", "active");
    });

    const panel = getActivePanel();

    fireEvent.change(within(panel).getByPlaceholderText("Juan Dela Cruz"), {
      target: { value: "Juan Dela Cruz" },
    });
    fireEvent.change(within(panel).getByPlaceholderText("name@dagupan.gov"), {
      target: { value: "juan@example.com" },
    });
    const password = within(panel).getByPlaceholderText("********");
    fireEvent.change(password, {
      target: { value: "abcdefghij" },
    });
    fireEvent.blur(password);

    expect(
      await screen.findByText(
        "Password must include at least 3 of: uppercase, lowercase, number, special character."
      )
    ).toBeInTheDocument();
    expect(adminSignup).not.toHaveBeenCalled();
  });

  it("clears inline error when login email becomes valid", async () => {
    renderAuth();

    const panel = getActivePanel();
    const email = within(panel).getByPlaceholderText("name@dagupan.gov");
    fireEvent.blur(email);
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();

    fireEvent.change(email, { target: { value: "valid@example.com" } });

    await waitFor(() => {
      expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
    });
  });

  it("submits login with normalized email", async () => {
    adminLogin.mockResolvedValue({ token: "token123" });
    renderAuth();

    const panel = getActivePanel();

    fireEvent.change(within(panel).getByPlaceholderText("name@dagupan.gov"), {
      target: { value: "  ADMIN@Example.COM " },
    });
    fireEvent.change(within(panel).getByPlaceholderText("********"), {
      target: { value: "AnyPassword1!" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: /Access Dashboard/i }));

    await waitFor(() => {
      expect(adminLogin).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "AnyPassword1!",
      });
    });
    expect(localStorage.getItem("admin_token")).toBe("token123");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});

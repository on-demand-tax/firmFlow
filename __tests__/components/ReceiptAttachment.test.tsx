import { fireEvent, render, screen } from '@testing-library/react';

import { ReceiptAttachment } from '@/components/app/ReceiptAttachment';

function createJpegFile(name = 'image.jpg') {
  return new File(['jpeg-bytes'], name, { type: 'image/jpeg' });
}

describe('ReceiptAttachment', () => {
  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:preview');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders mobile capture actions', () => {
    render(<ReceiptAttachment value={null} onChange={jest.fn()} />);

    expect(screen.getByTestId('receipt-mobile-actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '촬영' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '앨범' })).toBeInTheDocument();
  });

  it('renders desktop file picker actions', () => {
    render(<ReceiptAttachment value={null} onChange={jest.fn()} />);

    expect(screen.getByTestId('receipt-desktop-actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '파일 선택' })).toBeInTheDocument();
  });

  it('shows preview after selecting a valid image', () => {
    const onChange = jest.fn();
    render(<ReceiptAttachment value={null} onChange={onChange} />);

    const input = screen.getByTestId('receipt-camera-input');
    fireEvent.change(input, { target: { files: [createJpegFile()] } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'image/jpeg',
        name: expect.stringMatching(/^receipt-\d{8}-\d{6}\.jpg$/),
      }),
    );
  });

  it('shows preview when value is set', () => {
    const file = createJpegFile('receipt-20260624-120000.jpg');
    render(<ReceiptAttachment value={file} onChange={jest.fn()} />);

    expect(screen.getByTestId('receipt-preview')).toBeInTheDocument();
    expect(screen.getByText('receipt-20260624-120000.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 촬영' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다른 파일' })).toBeInTheDocument();
  });

  it('clears attachment when remove is clicked', () => {
    const onChange = jest.fn();
    const file = createJpegFile('receipt-20260624-120000.jpg');
    render(<ReceiptAttachment value={file} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '제거' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows error for unsupported mime', () => {
    render(<ReceiptAttachment value={null} onChange={jest.fn()} />);

    const input = screen.getByTestId('receipt-gallery-input');
    const heic = new File(['x'], 'photo.heic', { type: 'image/heic' });
    fireEvent.change(input, { target: { files: [heic] } });

    expect(
      screen.getByText('PDF, JPEG, PNG 파일만 첨부할 수 있습니다'),
    ).toBeInTheDocument();
  });
});
